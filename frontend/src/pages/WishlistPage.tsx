import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Star, MapPin, Trash2, Edit3 } from 'lucide-react';
import { wishlistAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Wishlist } from '../types';

const WishlistPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const { data: wishlistData, isLoading } = useQuery(
    'user-wishlist',
    () => wishlistAPI.getWishlist(1, 100),
    { enabled: !!user }
  );

  const removeFromWishlistMutation = useMutation(
    (restaurantId: string) => wishlistAPI.removeFromWishlist(restaurantId),
    {
      onSuccess: () => {
        toast.success('Removed from wishlist');
        queryClient.invalidateQueries('user-wishlist');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to remove from wishlist');
      },
    }
  );

  const updateNoteMutation = useMutation(
    ({ restaurantId, note }: { restaurantId: string; note: string }) =>
      wishlistAPI.updateWishlistNote(restaurantId, note),
    {
      onSuccess: () => {
        toast.success('Note updated');
        queryClient.invalidateQueries('user-wishlist');
        setEditingNote(null);
        setNoteText('');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to update note');
      },
    }
  );

  const handleStartEditNote = (wishlist: Wishlist) => {
    setEditingNote(wishlist.restaurantId);
    setNoteText(wishlist.note || '');
  };

  const handleSaveNote = (restaurantId: string) => {
    updateNoteMutation.mutate({ restaurantId, note: noteText });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteText('');
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view your wishlist</h1>
        <Link to="/login" className="btn-primary">
          Log In
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const wishlists = wishlistData?.data?.wishlists || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
        <p className="text-gray-600">
          Restaurants you want to visit ({wishlists.length} {wishlists.length === 1 ? 'restaurant' : 'restaurants'})
        </p>
      </div>

      {wishlists.length === 0 ? (
        <div className="card text-center py-12">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">
            Start adding restaurants you want to visit to your wishlist
          </p>
          <Link to="/restaurants" className="btn-primary">
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wishlist) => (
            <div key={wishlist.id} className="card hover:shadow-lg transition-shadow">
              <Link to={`/restaurants/${wishlist.restaurant.id}`}>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                    {wishlist.restaurant.name}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{wishlist.restaurant.city}, {wishlist.restaurant.country}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex text-yellow-400">
                      {[...Array(wishlist.restaurant.michelinStars)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {wishlist.restaurant.michelinStars} Star{wishlist.restaurant.michelinStars !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-500">
                      {wishlist.restaurant.cuisineType}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Note Section */}
              {editingNote === wishlist.restaurantId ? (
                <div className="space-y-2 mb-4">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Why do you want to visit this restaurant?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveNote(wishlist.restaurantId)}
                      disabled={updateNoteMutation.isLoading}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : wishlist.note ? (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Note:</span> {wishlist.note}
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 italic">No note added</p>
                </div>
              )}

              {/* Booking Window Hint */}
              {wishlist.restaurant.bookingWindowDays && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <span className="font-medium">Booking tip:</span> Opens {wishlist.restaurant.bookingWindowDays} days in advance
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => handleStartEditNote(wishlist)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  {wishlist.note ? 'Edit Note' : 'Add Note'}
                </button>
                <button
                  onClick={() => removeFromWishlistMutation.mutate(wishlist.restaurantId)}
                  disabled={removeFromWishlistMutation.isLoading}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Added {new Date(wishlist.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
