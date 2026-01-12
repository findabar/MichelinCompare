import { useState, useEffect } from 'react';
import { wishlistAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface WishlistButtonProps {
  restaurantId: string;
  restaurantName: string;
  onWishlistChange?: () => void;
}

export default function WishlistButton({
  restaurantId,
  restaurantName,
  onWishlistChange
}: WishlistButtonProps) {
  const { user } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (user) {
      checkWishlistStatus();
    }
  }, [restaurantId, user]);

  const checkWishlistStatus = async () => {
    try {
      const response = await wishlistAPI.checkWishlist(restaurantId);
      setInWishlist(response.data.inWishlist);
      if (response.data.wishlist?.note) {
        setNote(response.data.wishlist.note);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (inWishlist) {
        await wishlistAPI.removeFromWishlist(restaurantId);
        setInWishlist(false);
        setNote('');
        setShowNoteInput(false);
      } else {
        await wishlistAPI.addToWishlist({ restaurantId, note: note || undefined });
        setInWishlist(true);
        setShowNoteInput(false);
      }
      onWishlistChange?.();
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      alert(error.response?.data?.error || 'Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!user || !inWishlist) return;

    setLoading(true);
    try {
      await wishlistAPI.updateWishlistNote(restaurantId, note);
      setShowNoteInput(false);
    } catch (error: any) {
      console.error('Error updating note:', error);
      alert(error.response?.data?.error || 'Failed to update note');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={handleToggleWishlist}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            inWishlist
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg
            className="w-5 h-5"
            fill={inWishlist ? 'currentColor' : 'none'}
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
          {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
        </button>

        {inWishlist && (
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            title="Add/edit note"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        )}
      </div>

      {showNoteInput && inWishlist && (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label className="text-sm font-medium text-gray-700">
            Why do you want to visit {restaurantName}?
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="E.g., For Tokyo trip, Special occasion, Birthday celebration..."
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdateNote}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Save Note
            </button>
            <button
              onClick={() => setShowNoteInput(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {note && !showNoteInput && inWishlist && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Note:</span> {note}
          </p>
        </div>
      )}
    </div>
  );
}
