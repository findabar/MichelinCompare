# Michelin Scraper Service

A dedicated microservice for scraping Michelin starred restaurants and seeding the database.

## Architecture

This service is separate from the main backend to:
- Avoid build timeouts from large Puppeteer downloads
- Run independently and scale separately
- Handle resource-intensive scraping operations
- Allow for easier maintenance and updates

## Endpoints

- `GET /health` - Health check
- `GET /status` - Get current scraper status
- `POST /scrape` - Start scraping process
- `POST /stop` - Stop running scraper

## Environment Variables

```bash
DATABASE_URL=postgresql://...
PORT=3002
NODE_ENV=production
```

## Local Development

```bash
npm install
npm run dev
```

## Deployment

This service should be deployed as a separate Railway service:

1. Create new Railway service
2. Connect to this subdirectory
3. Set environment variables
4. Deploy

## Usage

```bash
# Start scraping
curl -X POST http://localhost:3002/scrape

# Check status
curl http://localhost:3002/status

# Health check
curl http://localhost:3002/health
```

## Integration

The main backend API communicates with this service via HTTP calls to trigger scraping operations.