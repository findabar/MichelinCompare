import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Star, MapPin, User, Plus, Trash2, Edit3, Save, X, RefreshCw } from 'lucide-react';
import { restaurantAPI, visitAPI, scraperAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import WishlistButton from '../components/WishlistButton';
import { getStarCount } from '../utils/restaurant';

interface VisitForm {
  dateVisited: string;
  notes: string;
  bestDish: string;
  occasion: string;
  moodRating: number;
}

interface EditForm {
  name: string;
  address: string;
  city: string;
  country: string;
  cuisineType: string;
  michelinStars: number;
  description: string;
}

const RestaurantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [hasLostStars, setHasLostStars] = useState(false);
  const [updatePreview, setUpdatePreview] = useState<{
    current: any;
    scraped: any;
    differences: string[];
  } | null>(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VisitForm>({
    defaultValues: {
      dateVisited: new Date().toISOString().split('T')[0],
      notes: '',
      bestDish: '',
      occasion: '',
      moodRating: 3,
    },
  });

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue, formState: { errors: editErrors } } = useForm<EditForm>();

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
      if (data.data.isFirstVisit) {
        toast.success(`Visit recorded! You earned ${data.data.pointsEarned} points!`);
      } else {
        toast.success('Visit recorded successfully!');
      }
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

  const updateRestaurantMutation = useMutation(
    (data: EditForm) => restaurantAPI.updateRestaurant(id!, data),
    {
      onSuccess: (data) => {
        toast.success(data.data.message);
        queryClient.invalidateQueries(['restaurant', id]);
        setIsEditing(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to update restaurant');
      },
    }
  );

  const previewUpdateMutation = useMutation(
    () => scraperAPI.previewUpdate(id!),
    {
      onSuccess: (response) => {
        if (response.data.comparison.scraped) {
          setUpdatePreview(response.data.comparison);
          setHasLostStars(response.data.hasLostStars);
          setShowUpdateModal(true);
          if (!response.data.hasDifferences && !response.data.hasLostStars) {
            toast.success('Restaurant data is already up to date!');
          } else if (response.data.hasLostStars) {
            toast.error('Restaurant no longer has Michelin stars');
          }
        } else {
          toast.error('Could not find restaurant on Michelin Guide');
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to fetch update preview');
      },
    }
  );

  const applyUpdateMutation = useMutation(
    (data: Partial<EditForm>) => restaurantAPI.updateRestaurant(id!, data),
    {
      onSuccess: () => {
        toast.success('Restaurant updated with Michelin data!');
        queryClient.invalidateQueries(['restaurant', id]);
        setShowUpdateModal(false);
        setUpdatePreview(null);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to apply update');
      },
    }
  );

  const onSubmitVisit = (data: VisitForm) => {
    createVisitMutation.mutate({
      restaurantId: id!,
      dateVisited: data.dateVisited,
      notes: data.notes,
      bestDish: data.bestDish,
      occasion: data.occasion,
      moodRating: data.moodRating ? Number(data.moodRating) : undefined,
    });
  };

  const handleDeleteRestaurant = () => {
    if (id) {
      deleteRestaurantMutation.mutate(id);
    }
  };

  const handleEditStart = () => {
    if (restaurant?.data) {
      const data = restaurant.data;
      setValue('name', data.name);
      setValue('address', data.address || '');
      setValue('city', data.city);
      setValue('country', data.country);
      setValue('cuisineType', data.cuisineType);
      setValue('michelinStars', data.michelinStars);
      setValue('description', data.description || '');
      setIsEditing(true);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    resetEdit();
  };

  const onSubmitEdit = (data: EditForm) => {
    updateRestaurantMutation.mutate(data);
  };

  const handleApplyUpdate = () => {
    if (!updatePreview?.scraped) return;

    const updateData: Partial<EditForm> = {};

    if (updatePreview.differences.includes('name')) {
      updateData.name = updatePreview.scraped.name;
    }
    if (updatePreview.differences.includes('city')) {
      updateData.city = updatePreview.scraped.city;
    }
    if (updatePreview.differences.includes('country')) {
      updateData.country = updatePreview.scraped.country;
    }
    if (updatePreview.differences.includes('cuisineType')) {
      updateData.cuisineType = updatePreview.scraped.cuisineType;
    }
    if (updatePreview.differences.includes('michelinStars') && updatePreview.scraped.michelinStars) {
      updateData.michelinStars = updatePreview.scraped.michelinStars;
    }
    if (updatePreview.differences.includes('description')) {
      updateData.description = updatePreview.scraped.description;
    }

    applyUpdateMutation.mutate(updateData);
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
          <div className="flex-1 mr-4">
            {!isEditing ? (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurantData.name}</h1>
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{restaurantData.address}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <input
                  {...registerEdit('name', { required: 'Name is required' })}
                  className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-300 focus:border-blue-500 outline-none w-full"
                  placeholder="Restaurant name"
                />
                {editErrors.name && (
                  <p className="text-sm text-red-600">{editErrors.name.message}</p>
                )}
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <input
                    {...registerEdit('address')}
                    className="flex-1 text-gray-600 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
                    placeholder="Address"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {!isEditing ? (
              <div className="flex items-center space-x-2">
                <div className="flex text-yellow-400">
                  {[...Array(getStarCount(restaurantData))].map((_, i) => (
                    <Star key={i} className="h-6 w-6 fill-current" />
                  ))}
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {getStarCount(restaurantData)} Star{getStarCount(restaurantData) !== 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <select
                  {...registerEdit('michelinStars', { required: 'Stars are required', valueAsNumber: true })}
                  className="text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1 focus:border-blue-500 outline-none"
                >
                  <option value={1}>1 Star</option>
                  <option value={2}>2 Stars</option>
                  <option value={3}>3 Stars</option>
                </select>
              </div>
            )}
            {user && user.admin && (
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => previewUpdateMutation.mutate()}
                      disabled={previewUpdateMutation.isLoading}
                      className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Check for updates from Michelin"
                    >
                      <RefreshCw className={`h-5 w-5 ${previewUpdateMutation.isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={handleEditStart}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit restaurant"
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSubmitEdit(onSubmitEdit)}
                      disabled={updateRestaurantMutation.isLoading}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save changes"
                    >
                      <Save className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleEditCancel}
                      disabled={updateRestaurantMutation.isLoading}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel editing"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete restaurant"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {!isEditing ? (
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
        ) : (
          <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuisine Type *
                </label>
                <input
                  {...registerEdit('cuisineType', { required: 'Cuisine type is required' })}
                  className="input-field"
                  placeholder="e.g. French, Japanese, Italian"
                />
                {editErrors.cuisineType && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.cuisineType.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    {...registerEdit('city', { required: 'City is required' })}
                    className="input-field"
                    placeholder="City"
                  />
                  {editErrors.city && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.city.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <input
                    {...registerEdit('country', { required: 'Country is required' })}
                    className="input-field"
                    placeholder="Country"
                  />
                  {editErrors.country && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.country.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...registerEdit('description')}
                rows={4}
                className="input-field"
                placeholder="Restaurant description (optional)"
              />
            </div>
          </form>
        )}

        {/* Wishlist and Social Indicators */}
        {user && !isEditing && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Wishlist</h3>
              <WishlistButton
                restaurantId={id!}
                restaurantName={restaurantData.name}
                onWishlistChange={() => queryClient.invalidateQueries(['restaurant', id])}
              />
            </div>

            {/* Social Indicator */}
            {restaurantData.socialIndicator && restaurantData.socialIndicator.friendsVisitedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{restaurantData.socialIndicator.friendsVisitedCount} {restaurantData.socialIndicator.friendsVisitedCount === 1 ? 'person has' : 'people have'} visited</span>
              </div>
            )}

            {/* Booking Window Hint */}
            {restaurantData.bookingWindowDays && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Booking tip:</span> Bookings typically open {restaurantData.bookingWindowDays} days in advance
                </p>
              </div>
            )}
          </div>
        )}

        {/* Visit Action */}
        {user && !isEditing && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                {hasVisited ? (
                  <>
                    <p className="font-medium text-gray-900 flex items-center space-x-2">
                      <Star className="h-5 w-5 fill-current text-green-600" />
                      <span>You've visited this restaurant!</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Log another visit to track your experience
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">Haven't visited yet?</p>
                    <p className="text-sm text-gray-600">
                      Mark as visited to earn {getStarCount(restaurantData)} point{getStarCount(restaurantData) !== 1 ? 's' : ''}!
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowVisitForm(!showVisitForm)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>{hasVisited ? 'Log Another Visit' : 'Mark as Visited'}</span>
              </button>
            </div>
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
                Best Dish (optional)
              </label>
              <input
                {...register('bestDish')}
                type="text"
                className="input-field"
                placeholder="What was the standout dish?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Occasion (optional)
              </label>
              <select
                {...register('occasion')}
                className="input-field"
              >
                <option value="">Select occasion...</option>
                <option value="celebration">Celebration</option>
                <option value="solo">Solo</option>
                <option value="work">Work</option>
                <option value="spontaneous">Spontaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience Rating (optional)
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Memorable</span>
                <input
                  {...register('moodRating', { valueAsNumber: true })}
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  className="flex-1"
                />
                <span className="text-sm text-gray-600">Life-changing</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="input-field"
                placeholder="Share your overall experience..."
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
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">{visit.user.username}</span>
                    <span className="text-sm text-gray-500">
                      visited on {new Date(visit.dateVisited).toLocaleDateString()}
                    </span>
                    {visit.occasion && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {visit.occasion}
                      </span>
                    )}
                  </div>
                  {visit.bestDish && (
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Best dish:</span> {visit.bestDish}
                    </p>
                  )}
                  {visit.moodRating && (
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-gray-600 mr-2">Experience:</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < visit.moodRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {visit.notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">{visit.notes}</p>
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

      {/* Update Comparison Modal */}
      {showUpdateModal && updatePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {updatePreview.differences.length > 0 ? 'Updates Available from Michelin' : 'Restaurant Data Comparison'}
            </h3>

            {hasLostStars && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-medium mb-2">
                  ⚠️ Restaurant No Longer Has Michelin Stars
                </p>
                <p className="text-red-700 text-sm mb-2">
                  This restaurant currently has {updatePreview.current.michelinStars} star(s) in the database,
                  but the Michelin Guide now shows: <span className="font-semibold">{updatePreview.scraped.distinction || 'no stars'}</span>
                </p>
                <p className="text-red-700 text-sm">
                  You may want to delete this restaurant from the database.
                </p>
              </div>
            )}

            {updatePreview.differences.length === 0 && !hasLostStars ? (
              <p className="text-gray-600 mb-6">
                No differences found. Your restaurant data matches the Michelin Guide.
              </p>
            ) : updatePreview.differences.length > 0 ? (
              <div className="space-y-4 mb-6">
                <p className="text-gray-600">
                  The following fields differ from the Michelin Guide:
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {updatePreview.differences.includes('name') && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Name</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 line-through">{updatePreview.current.name}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium">{updatePreview.scraped.name}</span>
                      </div>
                    </div>
                  )}
                  {updatePreview.differences.includes('city') && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">City</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 line-through">{updatePreview.current.city}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium">{updatePreview.scraped.city}</span>
                      </div>
                    </div>
                  )}
                  {updatePreview.differences.includes('country') && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Country</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 line-through">{updatePreview.current.country}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium">{updatePreview.scraped.country}</span>
                      </div>
                    </div>
                  )}
                  {updatePreview.differences.includes('cuisineType') && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Cuisine Type</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 line-through">{updatePreview.current.cuisineType}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium">{updatePreview.scraped.cuisineType}</span>
                      </div>
                    </div>
                  )}
                  {updatePreview.differences.includes('michelinStars') && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Michelin Stars</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 line-through">{updatePreview.current.michelinStars} Star{updatePreview.current.michelinStars !== 1 ? 's' : ''}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium">{updatePreview.scraped.michelinStars} Star{updatePreview.scraped.michelinStars !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )}
                  {updatePreview.differences.includes('description') && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Description</span>
                      <div className="space-y-2">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <span className="text-xs text-red-700 font-semibold">Current:</span>
                          <p className="text-sm text-red-900 mt-1">{updatePreview.current.description || '(None)'}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <span className="text-xs text-green-700 font-semibold">New:</span>
                          <p className="text-sm text-green-900 mt-1">{updatePreview.scraped.description || '(None)'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {updatePreview.differences.includes('michelinUrl') && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Michelin URL</span>
                      <div className="text-sm break-all">
                        <span className="text-gray-400">New: </span>
                        <a
                          href={updatePreview.scraped.michelinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {updatePreview.scraped.michelinUrl}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex space-x-3">
              {updatePreview.differences.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyUpdate}
                  disabled={applyUpdateMutation.isLoading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {applyUpdateMutation.isLoading ? 'Applying...' : 'Accept Changes'}
                </button>
              )}
              {hasLostStars && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdatePreview(null);
                    setShowDeleteConfirm(true);
                  }}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium"
                >
                  Delete Restaurant
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowUpdateModal(false);
                  setUpdatePreview(null);
                  setHasLostStars(false);
                }}
                disabled={applyUpdateMutation.isLoading}
                className={`${updatePreview.differences.length > 0 || hasLostStars ? 'flex-1' : 'w-full'} bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium`}
              >
                {updatePreview.differences.length > 0 || hasLostStars ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailPage;