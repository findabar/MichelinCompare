# Scraper API Documentation

The Scraper API allows you to remotely trigger the Michelin restaurant scraping process and monitor its progress.

## Authentication

All scraper endpoints (except status) require authentication using a Bearer token. You must be logged in as a user to access these endpoints.

```bash
# Get your token by logging in first
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'

# Use the returned token for scraper endpoints
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Start Scraping

**POST** `/api/scraper/start`

Starts the Michelin restaurant scraping process for UK and US restaurants.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Response (202 Accepted):**
```json
{
  "message": "Scraper started successfully",
  "status": "running",
  "startedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401` - Unauthorized (missing or invalid token)
- `409` - Scraper is already running

### 2. Check Status

**GET** `/api/scraper/status`

Check the current status of the scraping process. This endpoint does NOT require authentication.

**Response:**
```json
{
  "isRunning": true,
  "lastRun": "2024-01-15T10:30:00.000Z",
  "currentProgress": "Scraping 2-star restaurants from US...",
  "lastResult": {
    "success": true,
    "timestamp": "2024-01-15T10:25:00.000Z",
    "message": "Scraping and seeding completed successfully"
  },
  "error": null
}
```

**Status Fields:**
- `isRunning`: Whether scraper is currently active
- `lastRun`: When the scraper was last started
- `currentProgress`: Real-time progress message
- `lastResult`: Result of the last completed run
- `error`: Any error message from the current/last run

### 3. Stop Scraping

**POST** `/api/scraper/stop`

Stop the currently running scraping process.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Scraper stop requested",
  "status": "stopped"
}
```

**Error Response:**
- `400` - No scraper is currently running

## Usage Examples

### Complete Workflow

```bash
# 1. Login to get token
TOKEN=$(curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token')

# 2. Start scraping
curl -X POST https://your-app.railway.app/api/scraper/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 3. Monitor progress
curl https://your-app.railway.app/api/scraper/status

# 4. Check when completed (poll every 30 seconds)
while true; do
  STATUS=$(curl -s https://your-app.railway.app/api/scraper/status | jq -r '.isRunning')
  if [ "$STATUS" = "false" ]; then
    echo "Scraping completed!"
    curl https://your-app.railway.app/api/scraper/status | jq '.lastResult'
    break
  fi
  echo "Still running..."
  sleep 30
done
```

### JavaScript/Frontend Usage

```javascript
// Start scraping
async function startScraping() {
  const token = localStorage.getItem('token'); // Your JWT token

  try {
    const response = await fetch('/api/scraper/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Scraper started:', result);

      // Start monitoring progress
      monitorProgress();
    } else {
      const error = await response.json();
      console.error('Failed to start scraper:', error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Monitor progress
async function monitorProgress() {
  const interval = setInterval(async () => {
    try {
      const response = await fetch('/api/scraper/status');
      const status = await response.json();

      console.log('Progress:', status.currentProgress);

      if (!status.isRunning) {
        clearInterval(interval);
        console.log('Scraping completed:', status.lastResult);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  }, 5000); // Check every 5 seconds
}
```

## Process Details

The scraper performs these steps:

1. **Install Dependencies** - Installs Puppeteer and required packages
2. **Scrape UK Restaurants** - Gets 1⭐, 2⭐, 3⭐ restaurants from UK
3. **Scrape US Restaurants** - Gets 1⭐, 2⭐, 3⭐ restaurants from US
4. **Save Data** - Writes restaurant data to JSON file
5. **Seed Database** - Adds new restaurants to production database
6. **Complete** - Process finishes and server continues running

**Typical Duration:** 5-10 minutes depending on data volume

**Data Extracted:** Name, city, country, cuisine type, star level, address, description

## Security Notes

- Scraper endpoints require user authentication
- Status endpoint is public for monitoring
- Only authenticated users can start/stop scraping
- Consider implementing admin-only access in production

## Troubleshooting

**Common Issues:**

1. **"Scraper script not found"** - Scripts directory missing from deployment
2. **"Puppeteer fails"** - Memory/Chrome issues on Railway
3. **"Database connection failed"** - Check DATABASE_URL environment variable
4. **"Process hangs"** - Scraper may be stuck; use stop endpoint

**Debugging:**
- Check Railway logs for detailed scraper output
- Use status endpoint to see current progress
- Verify environment variables are set correctly