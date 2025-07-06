"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const geo_services_1 = require("./config/geo-services");
const userRoutes_1 = require("./routes/userRoutes");
const serviceRoutes_1 = require("./routes/serviceRoutes");
const authRoutes_1 = require("./routes/authRoutes");
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
// Initialize database before setting up routes
console.log("Database URL:", process.env.DATABASE_URL);
database_1.AppDataSource.initialize()
    .then(() => {
    console.log("Database connected");
    console.log("Loaded entities:", database_1.AppDataSource.entityMetadatas.map(e => e.name));
    try {
        const geoService = new geo_services_1.GeoService();
    }
    catch (error) {
        console.error("GeoService initialization failed:", error);
    }
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'healthy' });
    });
    // Apply routes
    app.use("/auth", authRoutes_1.authRouter);
    app.use("/users", userRoutes_1.userRouter);
    app.use("/services", serviceRoutes_1.serviceRouter);
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
})
    .catch((error) => {
    console.error("Database connection error:", error);
    process.exit(1);
});
