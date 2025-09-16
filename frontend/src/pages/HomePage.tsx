import { Link } from 'react-router-dom';
import { Star, Trophy, Map, Users } from 'lucide-react';
import { useQuery } from 'react-query';
import { leaderboardAPI, restaurantAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

      {/* How it Works */}
      <section className="card">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Map className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Discover</h3>
            <p className="text-gray-600">
              Browse our comprehensive database of Michelin-starred restaurants worldwide
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Visit & Track</h3>
            <p className="text-gray-600">
              Mark restaurants as visited and earn points based on their star rating
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Compete</h3>
            <p className="text-gray-600">
              Climb the leaderboard and show off your culinary adventures
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
                    {[...Array(restaurant.michelinStars)].map((_, i) => (
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
        <section className="card bg-primary-50 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Start Your Michelin Star Hunt?
          </h2>
          <p className="text-gray-600 mb-6">
            Join thousands of food enthusiasts tracking their culinary journeys
          </p>
          <Link to="/register" className="btn-primary text-lg px-8 py-3">
            Create Free Account
          </Link>
        </section>
      )}
    </div>
  );
};

export default HomePage;