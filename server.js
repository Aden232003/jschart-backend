const express = require('express');
const cors = require('cors');
const path = require('path');
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

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

async function fetchStockData(ticker, startDate, endDate, interval) {
    try {
        // Convert dates to proper format if they're Unix timestamps
        const start = new Date(parseInt(startDate) * 1000);
        const end = new Date(parseInt(endDate) * 1000);
        
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
            throw new Error("Start date cannot be after end date");
        }

        const queryOptions = {
            period1: start,
            period2: end,
            interval: interval
        };
        
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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});