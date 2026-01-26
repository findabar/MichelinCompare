import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on client errors (401, 403, 404)
        const status = error?.response?.status;
        if ([401, 403, 404].includes(status)) {
          return false;
        }

        // Retry 429 errors up to 3 times with exponential backoff
        if (status === 429) {
          return failureCount < 3;
        }

        // Retry network errors and server errors once
        return failureCount < 1;
      },
      retryDelay: (attemptIndex, error: any) => {
        const status = error?.response?.status;

        // For 429 errors, use Retry-After header or exponential backoff
        if (status === 429) {
          const retryAfter = error.response?.headers?.['retry-after'];
          if (retryAfter) {
            // Convert seconds to milliseconds
            return parseInt(retryAfter) * 1000;
          }
          // Exponential backoff: 1s, 2s, 4s (capped at 10s)
          return Math.min(1000 * 2 ** attemptIndex, 10000);
        }

        // Default delay for other errors: 1 second
        return 1000;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)