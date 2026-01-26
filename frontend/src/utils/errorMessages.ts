/**
 * Centralized error message handling for consistent user feedback
 */

export const getErrorMessage = (error: any): string => {
  const status = error?.response?.status;

  // Handle specific HTTP status codes
  switch (status) {
    case 429:
      const retryAfter = error?.response?.headers?.['retry-after'];
      if (retryAfter) {
        return `Too many requests. Please wait ${retryAfter} seconds and try again.`;
      }
      return 'Too many requests. Please slow down and try again in a moment.';

    case 401:
      return 'You need to log in to perform this action.';

    case 403:
      return 'You do not have permission to perform this action.';

    case 404:
      return 'The requested resource was not found.';

    case 409:
      return 'This action conflicts with existing data.';

    case 500:
      return 'Server error. Please try again later.';

    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';

    case 503:
      return 'Service unavailable. Please try again later.';

    case 504:
      return 'Request timeout. Please try again.';

    default:
      // Try to extract error message from API response
      if (error?.response?.data?.error) {
        // Handle both string and object error formats
        if (typeof error.response.data.error === 'string') {
          return error.response.data.error;
        }
        if (error.response.data.error.message) {
          return error.response.data.error.message;
        }
      }

      // Fallback to generic error message
      return error?.message || 'Something went wrong. Please try again.';
  }
};

/**
 * Get error message specifically for query failures (GET requests)
 */
export const getQueryErrorMessage = (error: any, resourceName: string = 'data'): string => {
  const status = error?.response?.status;

  // Don't show error for 429 - it's handled by the interceptor
  if (status === 429) {
    return '';
  }

  // For other errors, use resource-specific message
  if (status === 404) {
    return `${resourceName} not found.`;
  }

  if (status && status >= 500) {
    return `Failed to load ${resourceName}. Please try again later.`;
  }

  return `Failed to load ${resourceName}. Please try again.`;
};

/**
 * Check if an error is a network error (no response from server)
 */
export const isNetworkError = (error: any): boolean => {
  return !error.response && error.request;
};

/**
 * Check if an error is a rate limit error
 */
export const isRateLimitError = (error: any): boolean => {
  return error?.response?.status === 429;
};
