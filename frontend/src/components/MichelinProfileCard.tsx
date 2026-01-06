import { useQuery } from 'react-query';
import { Star, UtensilsCrossed, Users, User } from 'lucide-react';
import { userAPI } from '../services/api';

interface MichelinProfileCardProps {
  username: string;
}

const MichelinProfileCard = ({ username }: MichelinProfileCardProps) => {
  const { data: profileStats, isLoading } = useQuery(
    ['profile-stats', username],
    () => userAPI.getProfileStats(username),
    { enabled: !!username }
  );

  if (isLoading || !profileStats?.data) {
    return null;
  }

  const { cuisinePreferences, starDistribution, occasionStats } = profileStats.data;

  // Calculate dining style ratio
  const soloCount = occasionStats.find(s => s.category === 'solo')?.count || 0;
  const socialCount = occasionStats.find(s => s.category === 'social')?.count || 0;
  const totalWithOccasion = soloCount + socialCount;
  const soloPercentage = totalWithOccasion > 0 ? Math.round((soloCount / totalWithOccasion) * 100) : 0;
  const socialPercentage = totalWithOccasion > 0 ? Math.round((socialCount / totalWithOccasion) * 100) : 0;

  // Calculate star preference
  const oneStar = starDistribution.find(s => s.stars === 1)?.count || 0;
  const twoStar = starDistribution.find(s => s.stars === 2)?.count || 0;
  const threeStar = starDistribution.find(s => s.stars === 3)?.count || 0;
  const totalStarred = oneStar + twoStar + threeStar;

  const oneStarPercentage = totalStarred > 0 ? Math.round((oneStar / totalStarred) * 100) : 0;
  const threeStarPercentage = totalStarred > 0 ? Math.round((threeStar / totalStarred) * 100) : 0;

  const starPreference = threeStarPercentage > 50
    ? '3⭐ Heavy'
    : oneStarPercentage > 50
    ? '1⭐ Heavy'
    : 'Balanced';

  const diningStyle = totalWithOccasion === 0
    ? 'Not specified'
    : soloPercentage > 60
    ? 'Solo Diner'
    : socialPercentage > 60
    ? 'Social Diner'
    : 'Mixed';

  // Get top cuisine
  const topCuisine = cuisinePreferences.length > 0 ? cuisinePreferences[0].cuisineType : 'Various';

  return (
    <div className="card bg-gradient-to-br from-primary-50 to-white border-2 border-primary-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Your Michelin Profile</h2>
        <Star className="h-6 w-6 text-yellow-500 fill-current" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Star Distribution */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-gray-700">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">Star Preference</span>
          </div>
          <div className="text-2xl font-bold text-primary-700">{starPreference}</div>
          {totalStarred > 0 && (
            <div className="flex space-x-2 text-sm">
              {oneStar > 0 && (
                <span className="text-gray-600">1⭐: {oneStarPercentage}%</span>
              )}
              {twoStar > 0 && (
                <span className="text-gray-600">2⭐: {Math.round((twoStar / totalStarred) * 100)}%</span>
              )}
              {threeStar > 0 && (
                <span className="text-gray-600">3⭐: {threeStarPercentage}%</span>
              )}
            </div>
          )}
        </div>

        {/* Dining Style */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-gray-700">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Dining Style</span>
          </div>
          <div className="text-2xl font-bold text-primary-700">{diningStyle}</div>
          {totalWithOccasion > 0 && (
            <div className="flex space-x-2 text-sm text-gray-600">
              {soloCount > 0 && <span>Solo: {soloPercentage}%</span>}
              {socialCount > 0 && <span>Social: {socialPercentage}%</span>}
            </div>
          )}
        </div>

        {/* Favorite Cuisine */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-gray-700">
            <UtensilsCrossed className="h-5 w-5 text-green-500" />
            <span className="font-medium">Top Cuisine</span>
          </div>
          <div className="text-2xl font-bold text-primary-700">{topCuisine}</div>
          {cuisinePreferences.length > 1 && (
            <div className="text-sm text-gray-600">
              Also enjoys: {cuisinePreferences.slice(1, 3).map(c => c.cuisineType).join(', ')}
            </div>
          )}
        </div>

        {/* Profile Type - Note about Explorer vs Loyalist limitation */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-gray-700">
            <User className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Profile Type</span>
          </div>
          <div className="text-2xl font-bold text-primary-700">Explorer</div>
          <div className="text-sm text-gray-600">
            {totalStarred} {totalStarred === 1 ? 'restaurant' : 'restaurants'} discovered
          </div>
        </div>
      </div>

      {/* Share hint */}
      <div className="mt-6 pt-4 border-t border-primary-200">
        <p className="text-xs text-gray-500 text-center">
          Share your profile to show off your Michelin journey
        </p>
      </div>
    </div>
  );
};

export default MichelinProfileCard;
