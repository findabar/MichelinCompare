import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Star, MapPin, User, Plus, Trash2 } from 'lucide-react';
import { restaurantAPI, visitAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

interface VisitForm {
  dateVisited: string;
  notes: string;
}

const RestaurantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VisitForm>({
    defaultValues: {
      dateVisited: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const { data: restaurant, isLoading } = useQuery(
    ['restaurant', id],
    () => restaurantAPI.getRestaurant(id!),
    { enabled: !!id }
  );

  const { data: userVisits } = useQuery(
    'user-visits',
    () => visitAPI.getUserVisits(),
    { enabled: !!user }
  );

  const createVisitMutation = useMutation(visitAPI.createVisit, {
    onSuccess: (data) => {
      toast.success(`Visit recorded! You earned ${data.data.pointsEarned} points!`);
      queryClient.invalidateQueries('user-visits');
      queryClient.invalidateQueries(['restaurant', id]);
      setShowVisitForm(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to record visit');
    },
  });

  const deleteRestaurantMutation = useMutation(restaurantAPI.deleteRestaurant, {
    onSuccess: (data) => {
      toast.success(data.data.message);
      navigate('/restaurants');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete restaurant');
    },
  });

  const onSubmitVisit = (data: VisitForm) => {
    createVisitMutation.mutate({
      restaurantId: id!,
      dateVisited: data.dateVisited,
      notes: data.notes,
    });
  };

  const handleDeleteRestaurant = () => {
    if (id) {
      deleteRestaurantMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!restaurant?.data) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant not found</h1>
        <Link to="/restaurants" className="btn-primary">
          Back to Restaurants
        </Link>
      </div>
    );
  }

  const restaurantData = restaurant.data;
  const hasVisited = userVisits?.data?.visits.some(visit => visit.restaurantId === id);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurantData.name}</h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{restaurantData.address}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="flex text-yellow-400">
                {[...Array(restaurantData.michelinStars)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-current" />
                ))}
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {restaurantData.michelinStars} Star{restaurantData.michelinStars !== 1 ? 's' : ''}
              </span>
            </div>
            {user && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete restaurant"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Cuisine Type</h3>
            <p className="text-primary-600 font-medium">{restaurantData.cuisineType}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
            <p className="text-gray-600">{restaurantData.city}, {restaurantData.country}</p>
          </div>
          {restaurantData.description && (
            <div className="md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{restaurantData.description}</p>
            </div>
          )}
        </div>

        {/* Visit Action */}
        {user && (
          <div className="mt-6 pt-6 border-t">
            {hasVisited ? (
              <div className="flex items-center space-x-2 text-green-600">
                <Star className="h-5 w-5 fill-current" />
                <span className="font-medium">You've visited this restaurant!</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Haven't visited yet?</p>
                  <p className="text-sm text-gray-600">
                    Mark as visited to earn {restaurantData.michelinStars} point{restaurantData.michelinStars !== 1 ? 's' : ''}!
                  </p>
                </div>
                <button
                  onClick={() => setShowVisitForm(!showVisitForm)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Mark as Visited</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visit Form */}
      {showVisitForm && user && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Record Your Visit</h2>
          <form onSubmit={handleSubmit(onSubmitVisit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Visited *
              </label>
              <input
                {...register('dateVisited', { required: 'Date is required' })}
                type="date"
                className="input-field"
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.dateVisited && (
                <p className="mt-1 text-sm text-red-600">{errors.dateVisited.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="input-field"
                placeholder="Share your experience, favorite dishes, etc."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={createVisitMutation.isLoading}
                className="btn-primary disabled:opacity-50"
              >
                {createVisitMutation.isLoading ? 'Recording...' : 'Record Visit'}
              </button>
              <button
                type="button"
                onClick={() => setShowVisitForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recent Visits */}
      {restaurantData.visits && restaurantData.visits.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Visits</h2>
          <div className="space-y-4">
            {restaurantData.visits.map((visit: any) => (
              <div key={visit.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{visit.user.username}</span>
                    <span className="text-sm text-gray-500">
                      visited on {new Date(visit.dateVisited).toLocaleDateString()}
                    </span>
                  </div>
                  {visit.notes && (
                    <p className="text-sm text-gray-600 mt-1">{visit.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!user && (
        <div className="card bg-primary-50 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Track Your Visits</h2>
          <p className="text-gray-600 mb-4">
            Sign up to track your restaurant visits and compete with other food enthusiasts!
          </p>
          <div className="space-x-3">
            <Link to="/register" className="btn-primary">
              Sign Up
            </Link>
            <Link to="/login" className="btn-secondary">
              Log In
            </Link>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Restaurant</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{restaurantData.name}"? This will also delete all user visits associated with this restaurant. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleDeleteRestaurant}
                disabled={deleteRestaurantMutation.isLoading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {deleteRestaurantMutation.isLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteRestaurantMutation.isLoading}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailPage;