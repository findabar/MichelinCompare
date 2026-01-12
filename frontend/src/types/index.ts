export interface User {
  id: string;
  username: string;
  email: string;
  admin: boolean;
  totalScore: number;
  restaurantsVisitedCount: number;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  country: string;
  cuisineType: string;
  michelinStars: number;
  distinction?: string | null;
  yearAwarded: number;
  address: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  imageUrl?: string;
  bookingWindowDays?: number;
  createdAt: string;
  updatedAt: string;
  visits?: Array<{
    id: string;
    dateVisited: string;
    notes?: string;
    user: {
      username: string;
    };
  }>;
  socialIndicator?: {
    friendsVisitedCount: number;
  };
}

export interface UserVisit {
  id: string;
  userId: string;
  restaurantId: string;
  dateVisited: string;
  notes?: string;
  bestDish?: string;
  occasion?: string;
  moodRating?: number;
  createdAt: string;
  restaurant: Restaurant;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RestaurantFilters {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  city?: string;
  cuisineType?: string;
  michelinStars?: number;
}

export interface Pagination {
  current: number;
  total: number;
  count: number;
  totalCount: number;
}

export interface RestaurantResponse {
  restaurants: Restaurant[];
  pagination: Pagination;
}

export interface VisitResponse {
  visits: UserVisit[];
  pagination: Pagination;
}

export interface LeaderboardUser extends User {
  rank: number;
}

export interface LeaderboardResponse {
  users: LeaderboardUser[];
  pagination: Pagination;
}

export interface UserStats {
  byStars: Array<{ stars: number; count: number }>;
  byCountry: Array<{ country: string; count: number }>;
  totalVisits: number;
}

export interface FilterOptions {
  countries: string[];
  cities: Array<{ city: string; country: string }>;
  cuisineTypes: string[];
}

export interface Wishlist {
  id: string;
  userId: string;
  restaurantId: string;
  note?: string;
  createdAt: string;
  restaurant: Restaurant;
}

export interface WishlistResponse {
  wishlists: Wishlist[];
  pagination: Pagination;
}

export interface WishlistCheckResponse {
  inWishlist: boolean;
  wishlist: Wishlist | null;
}