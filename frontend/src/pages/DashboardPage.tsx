import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Star, Trophy, Map, Calendar, Trash2, Eye, BarChart3, MessageCircle, X } from 'lucide-react';
import { userAPI, visitAPI, feedbackAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import RestaurantMap from '../components/RestaurantMap';
import { getStarCount } from '../utils/restaurant';

interface FeedbackForm {
  feedbackType: string;
  description: string;
}

const DashboardPage = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'visits'>('overview');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  const { register: registerFeedback, handleSubmit: handleSubmitFeedback, reset: resetFeedback, formState: { errors: feedbackErrors } } = useForm<FeedbackForm>();

  const { data: profile, isLoading } = useQuery(
    'user-profile',
    userAPI.getProfile,
    {
      onSuccess: (data) => {
        if (data.data.user && user) {
          updateUser({
            ...user,
            totalScore: data.data.user.totalScore,
            restaurantsVisitedCount: data.data.user.restaurantsVisitedCount,
          });
        }
      },
    }
  );

  const { data: visits } = useQuery(
    'user-visits',
    () => visitAPI.getUserVisits(1, 50)
  );

  const deleteVisitMutation = useMutation(visitAPI.deleteVisit, {
    onSuccess: () => {
      toast.success('Visit removed successfully');
      queryClient.invalidateQueries('user-visits');
      queryClient.invalidateQueries('user-profile');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to remove visit');
    },
  });

  const submitFeedbackMutation = useMutation(feedbackAPI.submitFeedback, {
    onSuccess: (data) => {
      toast.success(data.data.message);
      setShowFeedbackModal(false);
      resetFeedback();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit feedback');
    },
  });

  const onSubmitFeedback = (data: FeedbackForm) => {
    submitFeedbackMutation.mutate(data);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!profile?.data?.user || !user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Unable to load profile</h1>
        <Link to="/" className="btn-primary">
          Go Home
        </Link>
      </div>
    );
  }

  const { user: profileUser, stats } = profile.data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.username}!</h1>
            <p className="text-gray-600 mt-1">Track your Michelin star hunting progress</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">{profileUser.totalScore}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{profileUser.totalScore}</div>
          <div className="text-gray-600">Total Stars</div>
        </div>
        <div className="card text-center">
          <Map className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{profileUser.restaurantsVisitedCount}</div>
          <div className="text-gray-600">Restaurants Visited</div>
        </div>
        <div className="card text-center">
          <Trophy className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {stats.byCountry?.length || 0}
          </div>
          <div className="text-gray-600">Countries Explored</div>
        </div>
        <div className="card text-center">
          <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {Math.round((profileUser.totalScore / profileUser.restaurantsVisitedCount || 0) * 100) / 100}
          </div>
          <div className="text-gray-600">Avg Stars/Visit</div>
        </div>
      </div>

      {/* Restaurant Map */}
      {visits?.data?.visits && (
        <RestaurantMap
          restaurants={visits.data.visits.map((visit: any) => ({
            id: visit.id,
            name: visit.restaurant.name,
            city: visit.restaurant.city,
            country: visit.restaurant.country,
            latitude: visit.restaurant.latitude,
            longitude: visit.restaurant.longitude,
            michelinStars: visit.restaurant.michelinStars,
            distinction: visit.restaurant.distinction,
          }))}
          apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
        />
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'visits'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Visits
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stars Distribution */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Stars Distribution</h2>
            {stats.byStars && stats.byStars.length > 0 ? (
              <div className="space-y-3">
                {stats.byStars.map((item) => (
                  <div key={item.stars} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex text-yellow-400">
                        {[...Array(item.stars)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <span className="font-medium">{item.stars} Star{item.stars !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.count}</div>
                      <div className="text-sm text-gray-500">
                        {item.count * item.stars} points
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No visits recorded yet</p>
            )}
          </div>

          {/* Countries Visited */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Countries Explored</h2>
            {stats.byCountry && stats.byCountry.length > 0 ? (
              <div className="space-y-2">
                {stats.byCountry.slice(0, 10).map((item) => (
                  <div key={item.country} className="flex justify-between items-center">
                    <span className="font-medium">{item.country}</span>
                    <span className="text-gray-600">{item.count} visit{item.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No countries visited yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Restaurant Visits</h2>
            <Link to="/restaurants" className="btn-primary">
              Add New Visit
            </Link>
          </div>

          {visits?.data?.visits && visits.data.visits.length > 0 ? (
            <div className="space-y-4">
              {visits.data.visits.map((visit) => (
                <div key={visit.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Link
                          to={`/restaurants/${visit.restaurant.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                        >
                          {visit.restaurant.name}
                        </Link>
                        <div className="flex text-yellow-400">
                          {[...Array(getStarCount(visit.restaurant))].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Map className="h-4 w-4 mr-1" />
                          {visit.restaurant.city}, {visit.restaurant.country}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(visit.dateVisited).toLocaleDateString()}
                        </div>
                        <div className="text-primary-600 font-medium">
                          {visit.restaurant.cuisineType}
                        </div>
                      </div>

                      {visit.occasion && (
                        <div className="mt-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {visit.occasion}
                          </span>
                        </div>
                      )}

                      {visit.bestDish && (
                        <p className="text-gray-700 mt-2 text-sm bg-gray-50 p-2 rounded">
                          <span className="font-medium">Best dish:</span> {visit.bestDish}
                        </p>
                      )}

                      {visit.moodRating && (
                        <div className="flex items-center mt-2">
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
                        <p className="text-gray-700 mt-2 text-sm bg-gray-50 p-2 rounded italic">
                          {visit.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        to={`/restaurants/${visit.restaurant.id}`}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="View restaurant"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => deleteVisitMutation.mutate(visit.id)}
                        disabled={deleteVisitMutation.isLoading}
                        className="p-2 text-red-400 hover:text-red-600 disabled:opacity-50"
                        title="Remove visit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No visits recorded yet</h3>
              <p className="text-gray-600 mb-4">
                Start your Michelin star hunt by visiting some restaurants!
              </p>
              <Link to="/restaurants" className="btn-primary">
                Explore Restaurants
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Feedback Button */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors shadow-md"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Give Feedback</span>
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Missing a restaurant or have a suggestion? Let us know!
          </p>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">Send Feedback</h3>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close feedback modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback(onSubmitFeedback)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Type *
                </label>
                <select
                  {...registerFeedback('feedbackType', { required: 'Please select a feedback type' })}
                  className="input-field"
                >
                  <option value="">Select feedback type...</option>
                  <option value="missing-restaurant">Missing Restaurant</option>
                  <option value="feature-request">Feature Request</option>
                  <option value="bug-report">Bug Report</option>
                  <option value="other">Other</option>
                </select>
                {feedbackErrors.feedbackType && (
                  <p className="mt-1 text-sm text-red-600">{feedbackErrors.feedbackType.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  {...registerFeedback('description', {
                    required: 'Please provide a description',
                    minLength: { value: 10, message: 'Description must be at least 10 characters' },
                    maxLength: { value: 2000, message: 'Description must be less than 2000 characters' }
                  })}
                  rows={5}
                  className="input-field"
                  placeholder="Please provide details about your feedback..."
                />
                {feedbackErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{feedbackErrors.description.message}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitFeedbackMutation.isLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitFeedbackMutation.isLoading ? 'Sending...' : 'Send Feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  disabled={submitFeedbackMutation.isLoading}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;