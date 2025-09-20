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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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

  updateRestaurant: (id: string, data: Partial<Restaurant>) =>
    api.put<{ success: boolean; message: string; restaurant: Restaurant }>(`/restaurants/${id}`, data),

  deleteRestaurant: (id: string) =>
    api.delete<{ success: boolean; message: string; deletedVisits: number }>(`/restaurants/${id}`),
};

export const visitAPI = {
  createVisit: (data: { restaurantId: string; dateVisited: string; notes?: string }) =>
    api.post<{ message: string; visit: UserVisit; pointsEarned: number }>('/visits', data),

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

export default api;