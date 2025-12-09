import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface Restaurant {
  id: number;
  name: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  michelinStars: number;
}

interface RestaurantMapProps {
  restaurants: Restaurant[];
  apiKey: string;
}

const RestaurantMap = ({ restaurants, apiKey }: RestaurantMapProps) => {
  // Filter restaurants that have coordinates
  const restaurantsWithCoords = restaurants.filter(
    (r) => r.latitude !== null && r.longitude !== null
  );

  // Calculate center of map based on restaurants
  const calculateCenter = () => {
    if (restaurantsWithCoords.length === 0) {
      // Default to world view centered on Europe
      return { lat: 48.8566, lng: 2.3522 };
    }

    const avgLat =
      restaurantsWithCoords.reduce((sum, r) => sum + (r.latitude || 0), 0) /
      restaurantsWithCoords.length;
    const avgLng =
      restaurantsWithCoords.reduce((sum, r) => sum + (r.longitude || 0), 0) /
      restaurantsWithCoords.length;

    return { lat: avgLat, lng: avgLng };
  };

  // Calculate appropriate zoom level based on restaurant spread
  const calculateZoom = () => {
    if (restaurantsWithCoords.length === 0) return 4;
    if (restaurantsWithCoords.length === 1) return 10;

    // Calculate the span of coordinates
    const lats = restaurantsWithCoords.map((r) => r.latitude || 0);
    const lngs = restaurantsWithCoords.map((r) => r.longitude || 0);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    const maxSpan = Math.max(latSpan, lngSpan);

    // Rough zoom calculation based on span
    if (maxSpan > 50) return 3;
    if (maxSpan > 20) return 4;
    if (maxSpan > 10) return 5;
    if (maxSpan > 5) return 6;
    if (maxSpan > 2) return 7;
    return 8;
  };

  const center = calculateCenter();
  const zoom = calculateZoom();

  // Get pin color based on Michelin stars
  const getPinColor = (stars: number) => {
    switch (stars) {
      case 3:
        return '#DC2626'; // Red for 3 stars
      case 2:
        return '#EA580C'; // Orange for 2 stars
      case 1:
        return '#FBBF24'; // Yellow for 1 star
      default:
        return '#6B7280'; // Gray for no stars
    }
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="h-[500px] w-full">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={zoom}
            mapId="restaurant-map"
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {restaurantsWithCoords.map((restaurant) => (
              <AdvancedMarker
                key={restaurant.id}
                position={{
                  lat: restaurant.latitude!,
                  lng: restaurant.longitude!,
                }}
                title={`${restaurant.name} - ${restaurant.michelinStars} ⭐`}
              >
                <Pin
                  background={getPinColor(restaurant.michelinStars)}
                  borderColor="#1F2937"
                  glyphColor="#FFFFFF"
                />
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 font-medium">Legend:</span>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-600"></div>
              <span className="text-gray-700">3 Stars</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-orange-600"></div>
              <span className="text-gray-700">2 Stars</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
              <span className="text-gray-700">1 Star</span>
            </div>
          </div>
          <span className="text-gray-600">
            {restaurantsWithCoords.length} of {restaurants.length} restaurants shown
          </span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantMap;
