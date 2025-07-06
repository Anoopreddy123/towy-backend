"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)(corsOptions));
// Parse JSON bodies
app.use(express_1.default.json());
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
