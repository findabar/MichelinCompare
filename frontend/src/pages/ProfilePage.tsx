import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Star, Map, Calendar, Trophy, User as UserIcon } from 'lucide-react';
import { userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStarCount } from '../utils/restaurant';

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();

  const { data: profile, isLoading } = useQuery(
    ['user-profile', username],
    () => userAPI.getUserProfile(username!),
    { enabled: !!username }
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!profile?.data) {
    return (
      <div className="text-center py-12">
        <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">User not found</h1>
        <Link to="/leaderboard" className="btn-primary">
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  const { user, recentVisits, stats } = profile.data;
  const isOwnProfile = currentUser?.id === user.id;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user.username}</h1>
              <p className="text-gray-600">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {isOwnProfile && (
            <Link to="/dashboard" className="btn-primary">
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-3xl font-bold text-gray-900">{user.totalScore}</div>
          <div className="text-gray-600">Total Stars</div>
        </div>
        <div className="card text-center">
          <Map className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <div className="text-3xl font-bold text-gray-900">{user.restaurantsVisitedCount}</div>
          <div className="text-gray-600">Restaurants Visited</div>
        </div>
        <div className="card text-center">
          <Trophy className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-3xl font-bold text-gray-900">
            {user.restaurantsVisitedCount > 0
              ? (user.totalScore / user.restaurantsVisitedCount).toFixed(1)
              : '0.0'}
          </div>
          <div className="text-gray-600">Average Stars</div>
        </div>
      </div>

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

        {/* Recent Visits */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Visits</h2>
          {recentVisits && recentVisits.length > 0 ? (
            <div className="space-y-3">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        to={`/restaurants/${visit.restaurant.id}`}
                        className="font-semibold text-gray-900 hover:text-primary-600 block"
                      >
                        {visit.restaurant.name}
                      </Link>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex text-yellow-400">
                          {[...Array(getStarCount(visit.restaurant))].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {visit.restaurant.city}, {visit.restaurant.country}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(visit.dateVisited).toLocaleDateString()}
                        </div>
                        {visit.occasion && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {visit.occasion}
                          </span>
                        )}
                      </div>
                    </div>
                    {visit.moodRating && (
                      <div className="flex ml-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < visit.moodRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {visit.bestDish && (
                    <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Best dish:</span> {visit.bestDish}
                    </p>
                  )}
                  {visit.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded italic">
                      {visit.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No visits recorded yet</p>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* First Visit */}
          <div className={`p-4 rounded-lg border-2 ${
            user.restaurantsVisitedCount > 0
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-center">
              <Trophy className={`h-8 w-8 mx-auto mb-2 ${
                user.restaurantsVisitedCount > 0 ? 'text-green-500' : 'text-gray-400'
              }`} />
              <div className="font-medium">First Visit</div>
              <div className="text-sm text-gray-600">Visit your first restaurant</div>
            </div>
          </div>

          {/* Star Collector */}
          <div className={`p-4 rounded-lg border-2 ${
            user.totalScore >= 10
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-center">
              <Star className={`h-8 w-8 mx-auto mb-2 ${
                user.totalScore >= 10 ? 'text-yellow-500' : 'text-gray-400'
              }`} />
              <div className="font-medium">Star Collector</div>
              <div className="text-sm text-gray-600">Earn 10 stars</div>
            </div>
          </div>

          {/* Explorer */}
          <div className={`p-4 rounded-lg border-2 ${
            user.restaurantsVisitedCount >= 5
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-center">
              <Map className={`h-8 w-8 mx-auto mb-2 ${
                user.restaurantsVisitedCount >= 5 ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <div className="font-medium">Explorer</div>
              <div className="text-sm text-gray-600">Visit 5 restaurants</div>
            </div>
          </div>

          {/* Connoisseur */}
          <div className={`p-4 rounded-lg border-2 ${
            stats.byStars?.some(s => s.stars === 3 && s.count > 0)
              ? 'bg-purple-50 border-purple-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-center">
              <Star className={`h-8 w-8 mx-auto mb-2 ${
                stats.byStars?.some(s => s.stars === 3 && s.count > 0)
                  ? 'text-purple-500' : 'text-gray-400'
              }`} />
              <div className="font-medium">Connoisseur</div>
              <div className="text-sm text-gray-600">Visit a 3-star restaurant</div>
            </div>
          </div>

          {/* Dedicated Hunter */}
          <div className={`p-4 rounded-lg border-2 ${
            user.restaurantsVisitedCount >= 10
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-center">
              <Trophy className={`h-8 w-8 mx-auto mb-2 ${
                user.restaurantsVisitedCount >= 10 ? 'text-red-500' : 'text-gray-400'
              }`} />
              <div className="font-medium">Dedicated Hunter</div>
              <div className="text-sm text-gray-600">Visit 10 restaurants</div>
            </div>
          </div>

          {/* Star Master */}
          <div className={`p-4 rounded-lg border-2 ${
            user.totalScore >= 50
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-center">
              <Star className={`h-8 w-8 mx-auto mb-2 ${
                user.totalScore >= 50 ? 'text-indigo-500' : 'text-gray-400'
              }`} />
              <div className="font-medium">Star Master</div>
              <div className="text-sm text-gray-600">Earn 50 stars</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;