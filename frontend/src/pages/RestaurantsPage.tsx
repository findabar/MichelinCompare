import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Star, MapPin, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { restaurantAPI } from '../services/api';
import { RestaurantFilters } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStarCount } from '../utils/restaurant';
import { getQueryErrorMessage } from '../utils/errorMessages';

const RestaurantsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RestaurantFilters>({
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20,
    search: searchParams.get('search') || '',
    country: searchParams.get('country') || '',
    city: searchParams.get('city') || '',
    cuisineType: searchParams.get('cuisineType') || '',
    michelinStars: searchParams.get('michelinStars') ? parseInt(searchParams.get('michelinStars')!) : undefined,
  });

  const { data: restaurants, isLoading } = useQuery(
    ['restaurants', filters],
    () => restaurantAPI.getRestaurants(filters),
    {
      keepPreviousData: true,
      onError: (error: any) => {
        // Only show toast if not 429 (already handled in interceptor)
        if (error?.response?.status !== 429) {
          const message = getQueryErrorMessage(error, 'restaurants');
          toast.error(message);
        }
      },
    }
  );

  const { data: filterOptions } = useQuery(
    'filter-options',
    restaurantAPI.getFilterOptions,
    {
      onError: (error: any) => {
        if (error?.response?.status !== 429) {
          toast.error('Failed to load filter options.');
        }
      },
    }
  );

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value.toString());
      }
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const updateFilter = (key: keyof RestaurantFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filter changes
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: '',
      country: '',
      city: '',
      cuisineType: '',
      michelinStars: undefined,
    });
  };

  const changePage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (isLoading && !restaurants) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Michelin-Starred Restaurants</h1>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary flex items-center space-x-2"
          aria-label="Toggle filters"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card space-y-4">
        <div className="relative">
          <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search restaurants, cities, or cuisine types..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label htmlFor="star-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Michelin Stars
              </label>
              <select
                id="star-filter"
                name="michelinStars"
                value={filters.michelinStars || ''}
                onChange={(e) => updateFilter('michelinStars', e.target.value ? parseInt(e.target.value) : undefined)}
                className="input-field"
                aria-label="Filter by Michelin stars"
              >
                <option value="">All Stars</option>
                <option value="1">1 Star</option>
                <option value="2">2 Stars</option>
                <option value="3">3 Stars</option>
              </select>
            </div>

            <div>
              <label htmlFor="country-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                id="country-filter"
                name="country"
                value={filters.country}
                onChange={(e) => updateFilter('country', e.target.value)}
                className="input-field"
                aria-label="Filter by country"
              >
                <option value="">All Countries</option>
                {filterOptions?.data.countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="city-filter" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <select
                id="city-filter"
                name="city"
                value={filters.city}
                onChange={(e) => updateFilter('city', e.target.value)}
                className="input-field"
                aria-label="Filter by city"
              >
                <option value="">All Cities</option>
                {filterOptions?.data.cities
                  .filter(item => !filters.country || item.country === filters.country)
                  .map((item) => (
                    <option key={`${item.city}-${item.country}`} value={item.city}>
                      {item.city}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="cuisine-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Cuisine Type
              </label>
              <select
                id="cuisine-filter"
                name="cuisineType"
                value={filters.cuisineType}
                onChange={(e) => updateFilter('cuisineType', e.target.value)}
                className="input-field"
                aria-label="Filter by cuisine type"
              >
                <option value="">All Cuisines</option>
                {filterOptions?.data.cuisineTypes.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-4">
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary text-sm"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {restaurants?.data && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Showing {restaurants.data.pagination.count} of {restaurants.data.pagination.totalCount} restaurants
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.data.restaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                to={`/restaurants/${restaurant.id}`}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold line-clamp-2">{restaurant.name}</h3>
                  <div className="flex text-yellow-400 ml-2">
                    {[...Array(getStarCount(restaurant))].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-primary-600 font-medium">{restaurant.cuisineType}</p>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-sm">{restaurant.city}, {restaurant.country}</span>
                  </div>
                  {restaurant.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{restaurant.description}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Awarded {restaurant.yearAwarded}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {restaurants.data.pagination.total > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => changePage(filters.page! - 1)}
                disabled={filters.page === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                Previous
              </button>

              {[...Array(Math.min(5, restaurants.data.pagination.total))].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => changePage(page)}
                    className={`px-3 py-2 rounded-lg ${
                      filters.page === page
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    aria-label={`Page ${page}`}
                    aria-current={filters.page === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => changePage(filters.page! + 1)}
                disabled={filters.page === restaurants.data.pagination.total}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RestaurantsPage;