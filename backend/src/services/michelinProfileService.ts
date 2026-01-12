import { prisma } from '../utils/prisma';

interface VisitData {
  id: string;
  dateVisited: Date;
  restaurantId: string;
  userId: string;
  restaurant: {
    id: string;
    name: string;
    city: string;
    country: string;
    cuisineType: string;
    michelinStars: number;
  };
}

interface ArchetypeResult {
  id: string;
  label: string;
  description: string;
}

interface StarsResult {
  total: number;
  average: number;
  distribution: {
    1: number;
    2: number;
    3: number;
  };
}

interface TravelStyleResult {
  label: string;
  countries: number;
  cities: number;
}

export interface MichelinProfileResult {
  archetype: ArchetypeResult;
  stars: StarsResult;
  cuisines: string[];
  travel_style: TravelStyleResult;
  traits: string[];
  last_updated: string;
}

/**
 * Calculate archetype based on visit patterns
 */
function calculateArchetype(visits: VisitData[]): ArchetypeResult {
  if (visits.length === 0) {
    return {
      id: 'occasionalist',
      label: 'Occasionalist',
      description: 'Your Michelin identity is just forming.',
    };
  }

  // Count unique restaurants and cities
  const uniqueRestaurants = new Set(visits.map(v => v.restaurantId)).size;
  const uniqueCities = new Set(visits.map(v => v.restaurant.city)).size;
  const totalVisits = visits.length;

  // Calculate repeat visit ratio
  const repeatRatio = totalVisits > 0 ? (totalVisits - uniqueRestaurants) / totalVisits : 0;

  // Calculate average stars
  const avgStars = visits.reduce((sum, v) => sum + v.restaurant.michelinStars, 0) / totalVisits;

  // Count unique cuisines
  const cuisines = new Set<string>();
  visits.forEach(v => {
    // Split multi-cuisine restaurants
    v.restaurant.cuisineType.split(/[,/&]/).forEach(c => cuisines.add(c.trim()));
  });
  const uniqueCuisines = cuisines.size;

  // Archetype scoring
  const scores: Record<string, number> = {
    explorer: 0,
    loyalist: 0,
    star_chaser: 0,
    curator: 0,
    occasionalist: 0,
  };

  // Explorer: many unique restaurants/cities
  if (uniqueRestaurants >= 10 && uniqueCities >= 5) {
    scores.explorer += 3;
  } else if (uniqueRestaurants >= 5 && uniqueCities >= 3) {
    scores.explorer += 2;
  } else if (uniqueRestaurants >= 3) {
    scores.explorer += 1;
  }

  // Loyalist: high repeat visits
  if (repeatRatio > 0.4) {
    scores.loyalist += 3;
  } else if (repeatRatio > 0.25) {
    scores.loyalist += 2;
  } else if (repeatRatio > 0.1) {
    scores.loyalist += 1;
  }

  // Star Chaser: high average star rating
  if (avgStars >= 2.5) {
    scores.star_chaser += 3;
  } else if (avgStars >= 2.0) {
    scores.star_chaser += 2;
  } else if (avgStars >= 1.5) {
    scores.star_chaser += 1;
  }

  // Curator: balanced stars + diverse cuisines
  const starDistribution = calculateStarDistribution(visits);
  const hasBalancedStars =
    starDistribution[1] > 0 &&
    starDistribution[2] > 0 &&
    starDistribution[3] > 0;

  if (hasBalancedStars && uniqueCuisines >= 5) {
    scores.curator += 3;
  } else if (uniqueCuisines >= 4) {
    scores.curator += 2;
  } else if (uniqueCuisines >= 3) {
    scores.curator += 1;
  }

  // Occasionalist: few but high-impact visits
  if (totalVisits <= 5 && avgStars >= 2.0) {
    scores.occasionalist += 3;
  } else if (totalVisits <= 3) {
    scores.occasionalist += 2;
  }

  // Find archetype with highest score
  const topArchetype = Object.entries(scores).reduce((a, b) =>
    b[1] > a[1] ? b : a
  );

  const archetypes: Record<string, { label: string; description: string }> = {
    explorer: {
      label: 'Explorer',
      description: 'You seek out new Michelin experiences wherever you travel.',
    },
    loyalist: {
      label: 'Loyalist',
      description: 'You return to cherished starred establishments, building relationships with your favorites.',
    },
    star_chaser: {
      label: 'Star Chaser',
      description: 'You pursue the highest accolades, gravitating toward 2⭐ and 3⭐ experiences.',
    },
    curator: {
      label: 'Curator',
      description: 'You seek balance across stars and cuisines, building a thoughtfully diverse collection.',
    },
    occasionalist: {
      label: 'Occasionalist',
      description: 'You dine at Michelin restaurants for special moments, making each visit count.',
    },
  };

  return {
    id: topArchetype[0],
    label: archetypes[topArchetype[0]].label,
    description: archetypes[topArchetype[0]].description,
  };
}

/**
 * Calculate star distribution
 */
function calculateStarDistribution(visits: VisitData[]): Record<number, number> {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  visits.forEach(v => {
    distribution[v.restaurant.michelinStars]++;
  });

  return distribution;
}

/**
 * Calculate star profile
 */
function calculateStarProfile(visits: VisitData[]): StarsResult {
  if (visits.length === 0) {
    return {
      total: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0 },
    };
  }

  const uniqueRestaurants = new Map<string, number>();
  visits.forEach(v => {
    if (!uniqueRestaurants.has(v.restaurantId)) {
      uniqueRestaurants.set(v.restaurantId, v.restaurant.michelinStars);
    }
  });

  const totalStars = Array.from(uniqueRestaurants.values()).reduce((sum, stars) => sum + stars, 0);
  const avgStars = totalStars / uniqueRestaurants.size;

  const distribution = calculateStarDistribution(visits);
  const totalUniqueVisits = uniqueRestaurants.size;

  return {
    total: totalStars,
    average: Math.round(avgStars * 10) / 10,
    distribution: {
      1: totalUniqueVisits > 0 ? Math.round((distribution[1] / totalUniqueVisits) * 100) : 0,
      2: totalUniqueVisits > 0 ? Math.round((distribution[2] / totalUniqueVisits) * 100) : 0,
      3: totalUniqueVisits > 0 ? Math.round((distribution[3] / totalUniqueVisits) * 100) : 0,
    },
  };
}

/**
 * Calculate top cuisines
 */
function calculateCuisineAffinity(visits: VisitData[]): string[] {
  const cuisineCounts = new Map<string, number>();

  visits.forEach(v => {
    // Split multi-cuisine restaurants and split weighting
    const cuisines = v.restaurant.cuisineType.split(/[,/&]/).map(c => c.trim());
    const weight = 1 / cuisines.length;

    cuisines.forEach(cuisine => {
      const current = cuisineCounts.get(cuisine) || 0;
      cuisineCounts.set(cuisine, current + weight);
    });
  });

  // Sort by count and return top 3
  return Array.from(cuisineCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine);
}

/**
 * Calculate travel style
 */
function calculateTravelStyle(visits: VisitData[]): TravelStyleResult {
  const uniqueCities = new Set(visits.map(v => v.restaurant.city));
  const uniqueCountries = new Set(visits.map(v => v.restaurant.country));
  const uniqueRestaurants = new Set(visits.map(v => v.restaurantId)).size;

  const cities = uniqueCities.size;
  const countries = uniqueCountries.size;
  const visitsPerCity = uniqueRestaurants > 0 ? cities / uniqueRestaurants : 0;

  let label = 'Local Connoisseur';

  if (countries >= 4) {
    label = 'Global Hunter';
  } else if (cities >= 5 || visitsPerCity > 0.5) {
    label = 'City Hopper';
  }

  return {
    label,
    countries,
    cities,
  };
}

/**
 * Calculate secondary dining traits
 */
function calculateTraits(visits: VisitData[]): string[] {
  const traits: string[] = [];

  if (visits.length === 0) {
    return traits;
  }

  // Check for repeat restaurants
  const uniqueRestaurants = new Set(visits.map(v => v.restaurantId)).size;
  const repeatRatio = (visits.length - uniqueRestaurants) / visits.length;

  if (repeatRatio < 0.1 && visits.length >= 5) {
    traits.push('Rarely repeats restaurants');
  }

  // Check star preference (use raw star counts for this)
  const starDist = calculateStarDistribution(visits);
  const total = visits.length;

  if (starDist[3] / total > 0.5 && visits.length >= 3) {
    traits.push('Prefers 3⭐ experiences');
  } else if ((starDist[2] + starDist[3]) / total > 0.7 && visits.length >= 5) {
    traits.push('Seeks elevated dining');
  }

  // Check for special occasions (if we have data)
  const occasionVisits = visits.filter(v =>
    (v as any).occasion && (v as any).occasion.toLowerCase().includes('special')
  );

  if (occasionVisits.length / visits.length > 0.5 && visits.length >= 3) {
    traits.push('Special-occasion focused');
  }

  return traits.slice(0, 3);
}

/**
 * Generate complete Michelin profile for a user
 */
export async function generateMichelinProfile(userId: string): Promise<MichelinProfileResult | null> {
  // Fetch all visits with restaurant data
  const visits = await prisma.userVisit.findMany({
    where: { userId },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          cuisineType: true,
          michelinStars: true,
        },
      },
    },
    orderBy: {
      dateVisited: 'desc',
    },
  }) as VisitData[];

  // Generate profile components
  const archetype = calculateArchetype(visits);
  const stars = calculateStarProfile(visits);
  const cuisines = calculateCuisineAffinity(visits);
  const travelStyle = calculateTravelStyle(visits);
  const traits = calculateTraits(visits);

  return {
    archetype,
    stars,
    cuisines,
    travel_style: travelStyle,
    traits,
    last_updated: new Date().toISOString(),
  };
}
