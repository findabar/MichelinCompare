import { Link } from 'react-router-dom';
import { Star, Trophy, Map, Users, Calendar, Plane, Heart, TrendingUp } from 'lucide-react';
import { useQuery } from 'react-query';
import { leaderboardAPI, restaurantAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getStarCount } from '../utils/restaurant';

const HomePage = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery('leaderboard-stats', leaderboardAPI.getStats);
  const { data: restaurants } = useQuery(
    'featured-restaurants',
    () => restaurantAPI.getRestaurants({ limit: 6, michelinStars: 3 })
  );

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome to Michelin Star Hunter
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Track your visits to Michelin-starred restaurants around the world and compete
          with fellow food enthusiasts for the highest score.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/restaurants" className="btn-primary text-lg px-8 py-3">
            Explore Restaurants
          </Link>
          {!user && (
            <Link to="/register" className="btn-secondary text-lg px-8 py-3">
              Join the Hunt
            </Link>
          )}
        </div>
      </section>

      {/* Stats Section */}
      {stats?.data && (
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card text-center">
            <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.data.totalUsers}</div>
            <div className="text-gray-600">Hunters</div>
          </div>
          <div className="card text-center">
            <Map className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.data.totalRestaurants}</div>
            <div className="text-gray-600">Restaurants</div>
          </div>
          <div className="card text-center">
            <Star className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.data.totalVisits}</div>
            <div className="text-gray-600">Visits Logged</div>
          </div>
          <div className="card text-center">
            <Trophy className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats.data.starDistribution?.reduce((sum: number, item: any) =>
                sum + (item.visit_count * item.stars), 0
              )}
            </div>
            <div className="text-gray-600">Total Stars Earned</div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="card">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">What You Can Do</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Map className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Explore Restaurants</h3>
            <p className="text-sm text-gray-600">
              Search and filter through thousands of Michelin-starred restaurants worldwide with interactive maps
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Track Your Visits</h3>
            <p className="text-sm text-gray-600">
              Log every visit with notes, photos, and ratings. Earn points based on star ratings (1★ = 1 point, 3★ = 3 points)
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Build Your Wishlist</h3>
            <p className="text-sm text-gray-600">
              Save restaurants you want to visit and organize your culinary bucket list
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Plane className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Plan Your Trips</h3>
            <p className="text-sm text-gray-600">
              Create detailed travel itineraries with restaurant recommendations for your culinary adventures
            </p>
          </div>
        </div>
      </section>

      {/* Competition Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Compete on the Leaderboard</h3>
              <p className="text-gray-600 mb-3">
                See how you rank against other food enthusiasts. Track your total points, visits, and countries explored.
              </p>
              <Link to="/leaderboard" className="text-blue-600 hover:text-blue-700 font-medium">
                View Leaderboard →
              </Link>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-start gap-4">
            <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Track Your Progress</h3>
              <p className="text-gray-600 mb-3">
                View detailed statistics about your dining history, favorite cuisines, and star distribution.
              </p>
              {user ? (
                <Link to="/profile" className="text-green-600 hover:text-green-700 font-medium">
                  View Your Profile →
                </Link>
              ) : (
                <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
                  Sign Up to Get Started →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="card bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
        <div className="text-center mb-6">
          <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            COMING SOON
          </span>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Exciting Features on the Horizon</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're constantly working to make your Michelin star hunting experience even better
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Calendar className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Table Reservations</h3>
            <p className="text-sm text-gray-600">
              Book tables directly through the platform with real-time availability and instant confirmation
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Users className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Social Features</h3>
            <p className="text-sm text-gray-600">
              Follow friends, share recommendations, and see what restaurants your network is exploring
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Star className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="text-lg font-semibold mb-2">AI Recommendations</h3>
            <p className="text-sm text-gray-600">
              Get personalized restaurant suggestions based on your taste preferences and dining history
            </p>
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      {restaurants?.data && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Featured 3-Star Restaurants</h2>
            <Link to="/restaurants?michelinStars=3" className="text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.data.restaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                to={`/restaurants/${restaurant.id}`}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                  <div className="flex text-yellow-400">
                    {[...Array(getStarCount(restaurant))].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-2">{restaurant.cuisineType}</p>
                <p className="text-sm text-gray-500">
                  {restaurant.city}, {restaurant.country}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!user && (
        <section className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Your Michelin Star Hunt?
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto text-lg">
            Join thousands of food enthusiasts tracking their culinary journeys. Create a free account to start logging visits, building wishlists, and competing on the global leaderboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 rounded-lg transition-colors text-lg">
              Create Free Account
            </Link>
            <Link to="/restaurants" className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-lg">
              Explore Restaurants
            </Link>
          </div>
          <p className="text-blue-200 text-sm mt-6">
            No credit card required • Free forever • Join {stats?.data?.totalUsers || '1000+'} hunters worldwide
          </p>
        </section>
      )}
    </div>
  );
};

export default HomePage;