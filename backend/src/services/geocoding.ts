import axios from 'axios';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface GeocodeError {
  error: string;
  address: string;
}

class GeocodingService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  private requestDelay = 20; // 20ms delay between requests to respect rate limits

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  GOOGLE_MAPS_API_KEY not set. Geocoding will not work.');
    }
  }

  /**
   * Geocode a single address to coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    if (!address || address.trim().length === 0) {
      console.warn('Empty address provided for geocoding');
      return null;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          address: address,
          key: this.apiKey,
        },
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
        };
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.warn(`No results found for address: ${address}`);
        return null;
      } else if (response.data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Google Maps API quota exceeded');
      } else {
        console.warn(`Geocoding failed for address: ${address}, Status: ${response.data.status}`);
        return null;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Geocoding API error for address "${address}":`, error.message);
      } else {
        console.error(`Unexpected error geocoding address "${address}":`, error);
      }
      return null;
    }
  }

  /**
   * Geocode multiple addresses with rate limiting
   */
  async geocodeBatch(
    addresses: Array<{ id: string; address: string }>,
    onProgress?: (processed: number, total: number, current: { id: string; address: string }) => void
  ): Promise<{
    successful: Array<{ id: string; result: GeocodeResult }>;
    failed: Array<{ id: string; address: string; error: string }>;
  }> {
    const successful: Array<{ id: string; result: GeocodeResult }> = [];
    const failed: Array<{ id: string; address: string; error: string }> = [];

    for (let i = 0; i < addresses.length; i++) {
      const item = addresses[i];

      try {
        // Call progress callback
        if (onProgress) {
          onProgress(i, addresses.length, item);
        }

        const result = await this.geocodeAddress(item.address);

        if (result) {
          successful.push({ id: item.id, result });
          console.log(`✅ Geocoded ${item.address}: ${result.latitude}, ${result.longitude}`);
        } else {
          failed.push({ id: item.id, address: item.address, error: 'No results found' });
          console.warn(`⚠️  Failed to geocode ${item.address}: No results`);
        }

        // Rate limiting: delay between requests
        if (i < addresses.length - 1) {
          await this.delay(this.requestDelay);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ id: item.id, address: item.address, error: errorMessage });
        console.error(`❌ Error geocoding ${item.address}:`, errorMessage);

        // If quota exceeded, stop processing
        if (errorMessage.includes('quota exceeded')) {
          console.error('⛔ API quota exceeded. Stopping batch geocoding.');
          break;
        }
      }
    }

    return { successful, failed };
  }

  /**
   * Retry geocoding with exponential backoff
   */
  async geocodeWithRetry(
    address: string,
    maxRetries = 3,
    initialDelay = 1000
  ): Promise<GeocodeResult | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.geocodeAddress(address);
        if (result) {
          return result;
        }
        // If null (no results), don't retry
        return null;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry if quota exceeded
        if (lastError.message.includes('quota exceeded')) {
          throw lastError;
        }

        if (attempt < maxRetries - 1) {
          const delayMs = initialDelay * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} for address: ${address} after ${delayMs}ms`);
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new Error('Failed to geocode after retries');
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new GeocodingService();
