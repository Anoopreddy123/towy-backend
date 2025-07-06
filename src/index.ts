import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Define CORS options
const corsOptions = {
    origin: [
        'https://towy-ui.vercel.app',
        'http://localhost:3000',
        /\.vercel\.app$/
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 204
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Simple health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Server is running' });
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});