import { Link, useNavigate } from 'react-router-dom';
import { Star, User, Trophy, Map, Home, LogOut, Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Star className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">Michelin Star Hunter</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link to="/restaurants" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600">
              <Map className="h-4 w-4" />
              <span>Restaurants</span>
            </Link>
            <Link to="/leaderboard" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600">
              <Trophy className="h-4 w-4" />
              <span>Leaderboard</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 bg-primary-50 text-primary-700 px-3 py-2 rounded-lg hover:bg-primary-100"
                >
                  <Star className="h-4 w-4" />
                  <span className="font-medium">{user.totalScore}</span>
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                    <User className="h-5 w-5" />
                    <span>{user.username}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to={`/profile/${user.username}`}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/wishlist"
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>Wishlist</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-b-lg flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;