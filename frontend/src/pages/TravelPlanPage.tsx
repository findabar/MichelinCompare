import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Calendar, MapPin, Star, Trash2, Share2, Plus, Plane } from 'lucide-react';
import { travelPlanAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { TravelPlanCreateRequest, TravelPlan as TravelPlanType } from '../types';

const TravelPlanPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<TravelPlanCreateRequest>({
    city: '',
    country: '',
    startDate: '',
    endDate: '',
    maxStarsPerDay: 3,
    preferredCuisines: [],
    includeVisited: false,
  });

  const { data: travelPlansData, isLoading } = useQuery(
    'user-travel-plans',
    () => travelPlanAPI.getTravelPlans(1, 100),
    { enabled: !!user }
  );

  const createTravelPlanMutation = useMutation(
    (data: TravelPlanCreateRequest) => travelPlanAPI.createTravelPlan(data),
    {
      onSuccess: () => {
        toast.success('Travel plan created successfully!');
        queryClient.invalidateQueries('user-travel-plans');
        setShowCreateForm(false);
        setFormData({
          city: '',
          country: '',
          startDate: '',
          endDate: '',
          maxStarsPerDay: 3,
          preferredCuisines: [],
          includeVisited: false,
        });
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to create travel plan');
      },
    }
  );

  const deleteTravelPlanMutation = useMutation(
    (id: string) => travelPlanAPI.deleteTravelPlan(id),
    {
      onSuccess: () => {
        toast.success('Travel plan deleted');
        queryClient.invalidateQueries('user-travel-plans');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to delete travel plan');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTravelPlanMutation.mutate(formData);
  };

  const handleShare = (travelPlan: TravelPlanType) => {
    const shareUrl = `${window.location.origin}/travel-plans/${travelPlan.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  const groupRestaurantsByDay = (travelPlan: TravelPlanType) => {
    const days = new Map<number, typeof travelPlan.restaurants>();
    travelPlan.restaurants.forEach((r) => {
      if (!days.has(r.day)) {
        days.set(r.day, []);
      }
      days.get(r.day)!.push(r);
    });
    return Array.from(days.entries()).sort((a, b) => a[0] - b[0]);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Please log in to create travel plans
        </h1>
        <Link to="/login" className="btn-primary">
          Log In
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const travelPlans = travelPlansData?.data?.travelPlans || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Travel Plans</h1>
          <p className="text-gray-600">Plan your Michelin star dining adventures</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Travel Plan
        </button>
      </div>

      {showCreateForm && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create Travel Plan</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="e.g., Tokyo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Japan"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Stars Per Day
              </label>
              <select
                value={formData.maxStarsPerDay}
                onChange={(e) =>
                  setFormData({ ...formData, maxStarsPerDay: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No limit</option>
                <option value="1">1 star</option>
                <option value="2">2 stars</option>
                <option value="3">3 stars</option>
                <option value="4">4 stars</option>
                <option value="5">5 stars</option>
                <option value="6">6 stars</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Limit total Michelin stars per day to avoid over-booking
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.includeVisited}
                  onChange={(e) =>
                    setFormData({ ...formData, includeVisited: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include restaurants I've already visited
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={createTravelPlanMutation.isLoading}
                className="btn-primary disabled:opacity-50"
              >
                {createTravelPlanMutation.isLoading ? 'Creating...' : 'Create Plan'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {travelPlans.length === 0 && !showCreateForm ? (
        <div className="card text-center py-12">
          <Plane className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No travel plans yet</h2>
          <p className="text-gray-600 mb-6">
            Create your first travel plan to get started
          </p>
          <button onClick={() => setShowCreateForm(true)} className="btn-primary">
            Create Travel Plan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {travelPlans.map((plan) => {
            const dayGroups = groupRestaurantsByDay(plan);
            const startDate = new Date(plan.startDate).toLocaleDateString();
            const endDate = new Date(plan.endDate).toLocaleDateString();

            return (
              <div key={plan.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.city}
                      {plan.country && `, ${plan.country}`}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {startDate} - {endDate}
                        </span>
                      </div>
                      <span>
                        {plan.restaurants.length} restaurant
                        {plan.restaurants.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleShare(plan)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Share plan"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteTravelPlanMutation.mutate(plan.id)}
                      disabled={deleteTravelPlanMutation.isLoading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="Delete plan"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {dayGroups.map(([day, restaurants]) => {
                    const dayDate = new Date(plan.startDate);
                    dayDate.setDate(dayDate.getDate() + day - 1);

                    return (
                      <div key={day} className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-bold text-gray-900 mb-2">
                          Day {day} - {dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h3>
                        <div className="space-y-3">
                          {restaurants
                            .sort((a, b) => a.order - b.order)
                            .map((planRestaurant) => (
                              <div
                                key={planRestaurant.id}
                                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex-shrink-0 mt-1">
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    {planRestaurant.mealType === 'lunch' ? 'Lunch' : 'Dinner'}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <Link
                                    to={`/restaurants/${planRestaurant.restaurant.id}`}
                                    className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                                  >
                                    {planRestaurant.restaurant.name}
                                  </Link>
                                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                    <div className="flex text-yellow-400">
                                      {[...Array(planRestaurant.restaurant.michelinStars)].map(
                                        (_, i) => (
                                          <Star key={i} className="h-3 w-3 fill-current" />
                                        )
                                      )}
                                    </div>
                                    <span>{planRestaurant.restaurant.cuisineType}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{planRestaurant.restaurant.address}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TravelPlanPage;
