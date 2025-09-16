import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Trophy, Star, Map, Medal, Crown } from 'lucide-react';
import { leaderboardAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const LeaderboardPage = () => {
  const { user } = useAuth();

  const { data: leaderboard, isLoading } = useQuery(
    'leaderboard',
    () => leaderboardAPI.getLeaderboard(1, 100)
  );

  const { data: stats } = useQuery(
    'leaderboard-stats',
    leaderboardAPI.getStats
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Trophy className="h-12 w-12 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
        <p className="text-gray-600">
          Top Michelin star hunters from around the world
        </p>
      </div>

      {/* Global Stats */}
      {stats?.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <Trophy className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.data.totalUsers}</div>
            <div className="text-gray-600">Total Hunters</div>
          </div>
          <div className="card text-center">
            <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.data.totalVisits}</div>
            <div className="text-gray-600">Visits Logged</div>
          </div>
          <div className="card text-center">
            <Map className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.data.totalRestaurants}</div>
            <div className="text-gray-600">Restaurants Available</div>
          </div>
        </div>
      )}

      {/* Top Countries */}
      {stats?.data?.topCountries && stats.data.topCountries.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Most Popular Countries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.data.topCountries.slice(0, 6).map((country: any) => (
              <div key={country.country} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{country.country}</span>
                  <div className="text-sm text-gray-600">
                    {country.unique_visitors} hunter{country.unique_visitors !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{country.total_visits}</div>
                  <div className="text-sm text-gray-500">visits</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Top Hunters</h2>

        {leaderboard?.data?.users && leaderboard.data.users.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.data.users.map((leaderUser) => (
              <div
                key={leaderUser.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${getRankBg(leaderUser.rank)} ${
                  user?.id === leaderUser.id ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12">
                    {getRankIcon(leaderUser.rank)}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/profile/${leaderUser.username}`}
                        className="font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {leaderUser.username}
                      </Link>
                      {user?.id === leaderUser.id && (
                        <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {leaderUser.restaurantsVisitedCount} restaurant{leaderUser.restaurantsVisitedCount !== 1 ? 's' : ''} visited
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="text-2xl font-bold text-gray-900">{leaderUser.totalScore}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {leaderUser.restaurantsVisitedCount > 0
                      ? (leaderUser.totalScore / leaderUser.restaurantsVisitedCount).toFixed(1)
                      : '0.0'} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hunters yet</h3>
            <p className="text-gray-600">Be the first to start your Michelin star hunt!</p>
          </div>
        )}
      </div>

      {/* Star Distribution */}
      {stats?.data?.starDistribution && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Community Stats by Stars</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.data.starDistribution.map((item: any) => (
              <div key={item.stars} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-center text-yellow-400 mb-2">
                  {[...Array(item.stars)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <div className="text-2xl font-bold text-gray-900">{item.visit_count}</div>
                <div className="text-sm text-gray-600">
                  visits by {item.unique_visitors} hunter{item.unique_visitors !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Position */}
      {user && leaderboard?.data?.users && (
        <div className="card bg-primary-50">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Your Position</h2>
          {(() => {
            const userPosition = leaderboard.data.users.find(u => u.id === user.id);
            if (userPosition) {
              return (
                <p className="text-gray-700">
                  You're currently ranked #{userPosition.rank} with {userPosition.totalScore} stars
                  from {userPosition.restaurantsVisitedCount} restaurant{userPosition.restaurantsVisitedCount !== 1 ? 's' : ''}!
                </p>
              );
            } else {
              return (
                <p className="text-gray-700">
                  You haven't visited any restaurants yet.
                  <Link to="/restaurants" className="text-primary-600 hover:text-primary-700 ml-1">
                    Start your hunt!
                  </Link>
                </p>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;