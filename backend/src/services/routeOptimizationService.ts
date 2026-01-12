interface Restaurant {
  id: string;
  name: string;
  michelinStars: number;
  latitude: number | null;
  longitude: number | null;
  isWishlisted?: boolean;
  isVisited?: boolean;
}

interface DayPlan {
  day: number;
  date: string;
  meals: MealPlan[];
}

interface MealPlan {
  mealType: 'lunch' | 'dinner';
  restaurant: Restaurant;
  order: number;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Calculate the center of mass for restaurants
function calculateCenter(restaurants: Restaurant[]): { lat: number; lon: number } {
  const validRestaurants = restaurants.filter((r) => r.latitude && r.longitude);
  if (validRestaurants.length === 0) {
    return { lat: 0, lon: 0 };
  }
  const sumLat = validRestaurants.reduce((sum, r) => sum + r.latitude!, 0);
  const sumLon = validRestaurants.reduce((sum, r) => sum + r.longitude!, 0);
  return {
    lat: sumLat / validRestaurants.length,
    lon: sumLon / validRestaurants.length,
  };
}

// Greedy nearest neighbor algorithm for route optimization
function optimizeRoute(restaurants: Restaurant[], startLat?: number, startLon?: number): Restaurant[] {
  if (restaurants.length === 0) return [];

  const unvisited = [...restaurants];
  const route: Restaurant[] = [];

  // Start from city center or first restaurant with coordinates
  let currentLat = startLat;
  let currentLon = startLon;

  if (!currentLat || !currentLon) {
    const center = calculateCenter(restaurants);
    currentLat = center.lat;
    currentLon = center.lon;
  }

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const restaurant = unvisited[i];
      if (restaurant.latitude && restaurant.longitude) {
        const distance = calculateDistance(
          currentLat!,
          currentLon!,
          restaurant.latitude,
          restaurant.longitude
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
    }

    const nearest = unvisited.splice(nearestIndex, 1)[0];
    route.push(nearest);

    if (nearest.latitude && nearest.longitude) {
      currentLat = nearest.latitude;
      currentLon = nearest.longitude;
    }
  }

  return route;
}

export function generateTravelPlan(
  restaurants: Restaurant[],
  days: number,
  maxStarsPerDay?: number
): DayPlan[] {
  // Sort restaurants: wishlist first, then by stars (descending)
  const sortedRestaurants = [...restaurants].sort((a, b) => {
    if (a.isWishlisted && !b.isWishlisted) return -1;
    if (!a.isWishlisted && b.isWishlisted) return 1;
    return b.michelinStars - a.michelinStars;
  });

  // Optimize route using nearest neighbor
  const optimizedRoute = optimizeRoute(sortedRestaurants);

  const dayPlans: DayPlan[] = [];
  let restaurantIndex = 0;
  const startDate = new Date();

  for (let day = 1; day <= days; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day - 1);

    const dayPlan: DayPlan = {
      day,
      date: date.toISOString().split('T')[0],
      meals: [],
    };

    let starsToday = 0;
    let mealOrder = 0;

    // Try to add lunch
    if (restaurantIndex < optimizedRoute.length) {
      const restaurant = optimizedRoute[restaurantIndex];
      const potentialStars = starsToday + restaurant.michelinStars;

      if (!maxStarsPerDay || potentialStars <= maxStarsPerDay) {
        dayPlan.meals.push({
          mealType: 'lunch',
          restaurant,
          order: mealOrder++,
        });
        starsToday += restaurant.michelinStars;
        restaurantIndex++;
      }
    }

    // Try to add dinner (avoid 2x 3-star in one day unless explicitly allowed)
    if (restaurantIndex < optimizedRoute.length) {
      const restaurant = optimizedRoute[restaurantIndex];
      const potentialStars = starsToday + restaurant.michelinStars;

      // Avoid suggesting multiple high-effort meals in one day
      const lunchIs3Star = dayPlan.meals.some(
        (m) => m.mealType === 'lunch' && m.restaurant.michelinStars === 3
      );
      const dinnerIs3Star = restaurant.michelinStars === 3;

      if (!maxStarsPerDay || potentialStars <= maxStarsPerDay) {
        if (!(lunchIs3Star && dinnerIs3Star)) {
          dayPlan.meals.push({
            mealType: 'dinner',
            restaurant,
            order: mealOrder++,
          });
          starsToday += restaurant.michelinStars;
          restaurantIndex++;
        }
      }
    }

    // Only add day if it has meals
    if (dayPlan.meals.length > 0) {
      dayPlans.push(dayPlan);
    }
  }

  return dayPlans;
}
