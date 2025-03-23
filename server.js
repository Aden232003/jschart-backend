const express = require('express');
const cors = require('cors');
const yahooFinance = require("yahoo-finance2").default;
const fetch = require("node-fetch");
global.fetch = fetch;

const app = express();
const PORT = process.env.PORT || 3001;

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Origin:', req.headers.origin);
    next();
});

// Updated CORS configuration using environment variables
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.CORS_ORIGIN || 'https://jschart-night.vercel.app',
            'http://localhost:5173'
        ];
        
        // Allow Vercel preview deployments (*.vercel.app)
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            console.log('CORS blocked for origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 204,
    preflightContinue: false,
    maxAge: 86400
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Suppress Yahoo Finance notices
yahooFinance.suppressNotices(['ripHistorical']);

async function fetchStockData(ticker, startDate, endDate, interval) {
    try {
        console.log('Received parameters:', { ticker, startDate, endDate, interval });
        
        // Convert Unix timestamps (seconds) to milliseconds for Yahoo Finance
        const start = new Date(parseInt(startDate) * 1000);
        const end = new Date(parseInt(endDate) * 1000);
        
        console.log('Converted dates:', {
            start: start.toISOString(),
            end: end.toISOString()
        });
        
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error("Invalid date format");
        }

        // Ensure end date is not in the future
        const today = new Date();
        if (end > today) {
            end = today;
        }

        if (start > end) {
            throw new Error(`Start date (${start.toISOString()}) cannot be after end date (${end.toISOString()})`);
        }

        const queryOptions = {
            period1: start,
            period2: end,
            interval: interval
        };
        
        console.log('Query options:', queryOptions);
        
        const data = await yahooFinance.historical(ticker, queryOptions);

        if (!data || data.length === 0) {
            throw new Error("No data found for the given ticker and date range.");
        }

        return data.map(entry => ({
            Date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : null,
            Close: entry.close
        })).filter(entry => entry.Date !== null);

    } catch (error) {
        console.error("Error fetching stock data:", error);
        throw error;
    }
}

// API root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'JSChart Backend API',
        endpoints: {
            '/api/stock-data': 'Get historical stock data',
            '/health': 'Health check endpoint'
        }
    });
});

app.get('/api/stock-data', async (req, res) => {
    try {
        const { ticker, startDate, endDate, timeframe } = req.query;
        
        if (!ticker || !startDate || !endDate || !timeframe) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const data = await fetchStockData(ticker, startDate, endDate, timeframe);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});