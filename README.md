# JSChart Backend

This is the backend server for the JSChart application, providing stock data through the Yahoo Finance API.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=3001
   CORS_ORIGIN=https://jschart-night.vercel.app
   ```

## Running Locally

```bash
node server.js
```

The server will start on port 3001 by default.

## API Endpoints

### GET /api/stock-data
Fetches historical stock data from Yahoo Finance.

Query Parameters:
- `ticker`: Stock symbol (e.g., AAPL)
- `startDate`: Unix timestamp for start date
- `endDate`: Unix timestamp for end date
- `timeframe`: Data interval (1d, 1wk, 1mo)

### GET /health
Health check endpoint.

## Deployment

This backend is configured for deployment on Render. The `render.yaml` file contains the deployment configuration.

## CORS

CORS is configured to allow requests from:
- https://jschart-night.vercel.app
- http://localhost:5173
- Any *.vercel.app domain 