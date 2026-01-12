import { useState, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Star, Filter, MapPin, Heart, CheckCircle2 } from 'lucide-react';
import { restaurantAPI } from '../services/api';
import { MapFilters, MapRestaurant } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const MapPage = () => {
  const { user } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null);

  // Layer toggles
  const [layers, setLayers] = useState({
    all: true,
    visited: user ? true : false,
    wishlist: user ? true : false,
  });

  // Star filter
  const [selectedStars, setSelectedStars] = useState<number[]>([1, 2, 3]);

  // Cuisine filter
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  const API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Get filter options
  const { data: filterOptions } = useQuery('filter-options', restaurantAPI.getFilterOptions);

  // Build filters for API call
  const buildFilters = useCallback((): MapFilters => {
    const apiFilters: MapFilters = {};

    // Add star filter (only if not all selected)
    if (selectedStars.length > 0 && selectedStars.length < 3) {
      apiFilters.stars = selectedStars.join(',');
    }

    // Add cuisine filter
    if (selectedCuisines.length > 0) {
      apiFilters.cuisines = selectedCuisines.join(',');
    }

    return apiFilters;
  }, [selectedStars, selectedCuisines]);

  // Fetch restaurants
  const { data, isLoading } = useQuery(
    ['map-restaurants', buildFilters()],
    () => restaurantAPI.getMapRestaurants(buildFilters()),
    {
      enabled: true,
      keepPreviousData: true,
    }
  );

  // Filter restaurants by layer
  const filteredRestaurants = (data?.data.restaurants || []).filter((restaurant) => {
    if (!user) return layers.all;

    if (layers.all && !restaurant.isVisited && !restaurant.isWishlisted) return true;
    if (layers.visited && restaurant.isVisited) return true;
    if (layers.wishlist && restaurant.isWishlisted) return true;

    return false;
  });

  // Note: Automatic bounds filtering could be added in the future
  // For now, we load all restaurants matching the filters
  // and let the user pan/zoom the map freely

  // Toggle star filter
  const toggleStar = (star: number) => {
    setSelectedStars(prev =>
      prev.includes(star)
        ? prev.filter(s => s !== star)
        : [...prev, star]
    );
  };

  // Toggle cuisine filter
  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  // Get pin color based on restaurant status and stars
  const getPinColor = (restaurant: MapRestaurant) => {
    // If visited, use green
    if (restaurant.isVisited) return '#10B981';

    // If wishlisted, use purple
    if (restaurant.isWishlisted) return '#8B5CF6';

    // Otherwise, color by stars
    switch (restaurant.michelinStars) {
      case 3:
        return '#DC2626'; // Red
      case 2:
        return '#EA580C'; // Orange
      case 1:
        return '#FBBF24'; // Yellow
      default:
        return '#6B7280'; // Gray
    }
  };

  // Default center (Paris, France)
  const defaultCenter = { lat: 48.8566, lng: 2.3522 };

  if (isLoading && !data) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Restaurant Map</h1>
          <p className="text-gray-600 mt-1">
            Explore Michelin-starred restaurants visually
          </p>
        </div>
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="card space-y-4">
          {/* Layer Toggles */}
          {user && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Layers</h3>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers.all}
                    onChange={(e) => setLayers(prev => ({ ...prev, all: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">All Restaurants</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers.visited}
                    onChange={(e) => setLayers(prev => ({ ...prev, visited: e.target.checked }))}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center space-x-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Visited</span>
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers.wishlist}
                    onChange={(e) => setLayers(prev => ({ ...prev, wishlist: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center space-x-1">
                    <Heart className="h-4 w-4 text-purple-600" />
                    <span>Wishlist</span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Star Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Michelin Stars</h3>
            <div className="flex gap-2">
              {[1, 2, 3].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => toggleStar(star)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStars.includes(star)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {star} {star === 1 ? 'Star' : 'Stars'}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine Filter */}
          {filterOptions?.data && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Cuisine Types</h3>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {filterOptions.data.cuisineTypes.slice(0, 20).map((cuisine) => (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => toggleCuisine(cuisine)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCuisines.includes(cuisine)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          <button
            type="button"
            onClick={() => {
              setSelectedStars([1, 2, 3]);
              setSelectedCuisines([]);
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Map */}
      <div className="card p-0 overflow-hidden">
        <div className="h-[600px] w-full">
          <APIProvider apiKey={API_KEY}>
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={4}
              mapId="michelin-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              {filteredRestaurants.map((restaurant) => (
                <AdvancedMarker
                  key={restaurant.id}
                  position={{
                    lat: restaurant.latitude,
                    lng: restaurant.longitude,
                  }}
                  onClick={() => setSelectedRestaurant(restaurant)}
                >
                  <Pin
                    background={getPinColor(restaurant)}
                    borderColor="#1F2937"
                    glyphColor="#FFFFFF"
                  />
                </AdvancedMarker>
              ))}

              {/* Info Window */}
              {selectedRestaurant && (
                <InfoWindow
                  position={{
                    lat: selectedRestaurant.latitude,
                    lng: selectedRestaurant.longitude,
                  }}
                  onCloseClick={() => setSelectedRestaurant(null)}
                >
                  <div className="p-2 max-w-sm">
                    {selectedRestaurant.imageUrl && (
                      <img
                        src={selectedRestaurant.imageUrl}
                        alt={selectedRestaurant.name}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    )}
                    <Link
                      to={`/restaurants/${selectedRestaurant.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {selectedRestaurant.name}
                    </Link>
                    <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span>{selectedRestaurant.michelinStars} {selectedRestaurant.michelinStars === 1 ? 'Star' : 'Stars'}</span>
                      {selectedRestaurant.distinction && (
                        <span className="text-gray-500">• {selectedRestaurant.distinction}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 mt-1 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedRestaurant.city}, {selectedRestaurant.country}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{selectedRestaurant.cuisineType}</p>
                    {selectedRestaurant.isVisited && (
                      <div className="mt-2 flex items-center space-x-1 text-green-600 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Visited</span>
                      </div>
                    )}
                    {selectedRestaurant.isWishlisted && (
                      <div className="mt-2 flex items-center space-x-1 text-purple-600 text-sm">
                        <Heart className="h-4 w-4 fill-current" />
                        <span>In Wishlist</span>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </div>

        {/* Legend */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm flex-wrap gap-4">
            <div className="flex items-center flex-wrap gap-4">
              <span className="text-gray-600 font-medium">Legend:</span>
              {user && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-gray-700">Visited</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    <span className="text-gray-700">Wishlist</span>
                  </div>
                </>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
                <span className="text-gray-700">3 Stars</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-orange-600"></div>
                <span className="text-gray-700">2 Stars</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                <span className="text-gray-700">1 Star</span>
              </div>
            </div>
            <span className="text-gray-600">
              {filteredRestaurants.length} of {data?.data.restaurants.length || 0} restaurants shown
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
