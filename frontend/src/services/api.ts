import axios from 'axios';
import type {
  AuthResponse,
  RestaurantResponse,
  RestaurantFilters,
  VisitResponse,
  LeaderboardResponse,
  UserStats,
  FilterOptions,
  Restaurant,
  UserVisit,
  Wishlist,
  WishlistResponse,
  WishlistCheckResponse,
  MapFilters,
  MapResponse,
  TravelPlan,
  TravelPlanResponse,
  TravelPlanCreateRequest,
} from '../types';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 403 and haven't already retried
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const response = await api.post('/auth/refresh');
        const { token, user } = response.data;

        // Update stored credentials
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.match(/^\/(login|register)/)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle 401 or already retried 403
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.match(/^\/(login|register)/)) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
};

export const restaurantAPI = {
  getRestaurants: (filters: RestaurantFilters) =>
    api.get<RestaurantResponse>('/restaurants', { params: filters }),

  getRestaurant: (id: string) =>
    api.get<Restaurant>(`/restaurants/${id}`),

  getFilterOptions: () =>
    api.get<FilterOptions>('/restaurants/filters'),

  getMapRestaurants: (filters: MapFilters) => {
    const params: any = { ...filters };
    if (filters.bounds) {
      params.bounds = JSON.stringify(filters.bounds);
    }
    return api.get<MapResponse>('/restaurants/map', { params });
  },

  updateRestaurant: (id: string, data: Partial<Restaurant>) =>
    api.put<{ success: boolean; message: string; restaurant: Restaurant }>(`/restaurants/${id}`, data),

  deleteRestaurant: (id: string) =>
    api.delete<{ success: boolean; message: string; deletedVisits: number }>(`/restaurants/${id}`),
};

export const visitAPI = {
  createVisit: (data: { restaurantId: string; dateVisited: string; notes?: string; bestDish?: string; occasion?: string; moodRating?: number }) =>
    api.post<{ message: string; visit: UserVisit; pointsEarned: number; isFirstVisit: boolean }>('/visits', data),

  getUserVisits: (page = 1, limit = 20) =>
    api.get<VisitResponse>('/visits', { params: { page, limit } }),

  deleteVisit: (id: string) =>
    api.delete(`/visits/${id}`),
};

export const userAPI = {
  getProfile: () =>
    api.get<{ user: any; stats: UserStats }>('/users/profile'),

  getUserProfile: (username: string) =>
    api.get<{ user: any; recentVisits: UserVisit[]; stats: UserStats }>(`/users/profile/${username}`),

  getProfileStats: (username: string) =>
    api.get<{
      cuisinePreferences: Array<{ cuisineType: string; count: number }>;
      starDistribution: Array<{ stars: number; count: number }>;
      occasionStats: Array<{ category: string; count: number }>;
    }>(`/users/profile/${username}/profile-stats`),
};

export const leaderboardAPI = {
  getLeaderboard: (page = 1, limit = 50) =>
    api.get<LeaderboardResponse>('/leaderboard', { params: { page, limit } }),

  getStats: () =>
    api.get('/leaderboard/stats'),
};

export const feedbackAPI = {
  submitFeedback: (data: { feedbackType: string; description: string }) =>
    api.post<{ success: boolean; message: string }>('/feedback', data),
};

export const scraperAPI = {
  previewUpdate: (id: string) =>
    api.get<{
      success: boolean;
      restaurantId: string;
      comparison: {
        current: {
          id: string;
          name: string;
          city: string;
          country: string;
          cuisineType: string;
          michelinStars: number;
          address: string;
          phone: string | null;
          website: string | null;
          description: string | null;
          michelinUrl: string | null;
        };
        scraped: {
          name: string;
          city: string;
          country: string;
          cuisineType: string;
          michelinStars: number | null;
          distinction: string | null;
          michelinUrl: string | null;
        } | null;
        differences: string[];
      };
      hasDifferences: boolean;
      hasLostStars: boolean;
    }>(`/scraper/preview-update/${id}`),

  seedProduction: (clearExisting = false) =>
    api.post<{
      success: boolean;
      message: string;
      seededCount: number;
      skippedCount: number;
      output: string;
      stderr?: string;
    }>('/scraper/seed-production', { clearExisting }),
};

export const wishlistAPI = {
  getWishlist: (page = 1, limit = 20) =>
    api.get<WishlistResponse>('/wishlist', { params: { page, limit } }),

  addToWishlist: (data: { restaurantId: string; note?: string }) =>
    api.post<{ message: string; wishlist: Wishlist }>('/wishlist', data),

  updateWishlistNote: (restaurantId: string, note: string) =>
    api.patch<{ message: string; wishlist: Wishlist }>(`/wishlist/${restaurantId}`, { note }),

  removeFromWishlist: (restaurantId: string) =>
    api.delete<{ message: string }>(`/wishlist/${restaurantId}`),

  checkWishlist: (restaurantId: string) =>
    api.get<WishlistCheckResponse>(`/wishlist/check/${restaurantId}`),
};

export const travelPlanAPI = {
  getTravelPlans: (page = 1, limit = 20) =>
    api.get<TravelPlanResponse>('/travel-plans', { params: { page, limit } }),

  createTravelPlan: (data: TravelPlanCreateRequest) =>
    api.post<{ message: string; travelPlan: TravelPlan; shareUrl: string }>('/travel-plans', data),

  getTravelPlan: (id: string) =>
    api.get<{ travelPlan: TravelPlan }>(`/travel-plans/${id}`),

  getSharedTravelPlan: (token: string) =>
    api.get<{ travelPlan: TravelPlan }>(`/travel-plans/share/${token}`),

  deleteTravelPlan: (id: string) =>
    api.delete<{ message: string }>(`/travel-plans/${id}`),
};

export default api;