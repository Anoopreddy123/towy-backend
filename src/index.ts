import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource, simpleDbPool } from "./config/database";
import { userRouter } from "./routes/userRoutes";
import { serviceRouter } from "./routes/serviceRoutes";
import { authRouter } from "./routes/authRoutes";
import { notificationEventHandler } from "./events/NotificationEventHandler";
import { eventBus } from "./events/EventBus";
import dotenv from 'dotenv';
dotenv.config();

// CRITICAL: Bypass SSL validation for PostgreSQL connections in serverless environments
process.env.PGSSLMODE = 'no-verify';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const port = process.env.PORT || 4000;

// Define CORS options
const corsOptions = {
    origin: [
        'https://www.towy.me',
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

// Health check endpoint (always available)
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Server is running' });
});

// Test endpoint (always available)
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Event system test endpoint
app.get('/test-events', async (req, res) => {
    try {
        const stats = eventBus.getEventStats();
        const testResult = await notificationEventHandler.testNotificationSystem();
        
        // Test event emission
        console.log('Testing event emission...');
        eventBus.emitEvent({
            id: 'test-event-' + Date.now(),
            type: 'service_request_created',
            timestamp: new Date(),
            data: {
                requestId: 'test-request-123',
                userId: 'test-user-123',
                serviceType: 'towing',
                location: 'Test Location',
                coordinates: { lat: 40.7128, lng: -74.0060 },
                description: 'Test request',
                vehicleType: 'Sedan'
            }
        });
        
        res.json({
            message: 'Event system test completed',
            eventBus: stats,
            notificationSystem: testResult ? 'working' : 'has issues',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            message: 'Event system test failed',
            error: error.message
        });
    }
});

// Database test endpoint
app.get('/db-test', async (req, res) => {
    try {
        if (AppDataSource.isInitialized) {
            const entities = AppDataSource.entityMetadatas && Array.isArray(AppDataSource.entityMetadatas) 
                ? AppDataSource.entityMetadatas.map(e => e.name)
                : [];
            res.json({ 
                status: 'connected', 
                message: 'Database is connected',
                entities: entities
            });
        } else {
            res.json({ 
                status: 'not_connected', 
                message: 'Database is not connected',
                error: 'Database initialization failed'
            });
        }
    } catch (error: any) {
        res.json({ 
            status: 'error', 
            message: 'Database test failed',
            error: error.message
        });
    }
});

// Simple database connection test
app.get('/simple-db-test', async (req, res) => {
    try {
        const client = await simpleDbPool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        res.json({ 
            status: 'connected', 
            message: 'Simple database connection works',
            timestamp: result.rows[0].now
        });
    } catch (error: any) {
        res.json({ 
            status: 'error', 
            message: 'Simple database connection failed',
            error: error.message
        });
    }
});

// Always register routes (they will handle database errors internally)
app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/services", serviceRouter);

// Initialize database
async function initializeDatabase() {
    try {
        console.log("Database URL:", process.env.DATABASE_URL);
        console.log("Starting database initialization...");
        
        await AppDataSource.initialize();
        
        console.log("Database connected successfully");
        const entities = AppDataSource.entityMetadatas && Array.isArray(AppDataSource.entityMetadatas)
            ? AppDataSource.entityMetadatas.map(e => e.name)
            : [];
        console.log("Loaded entities:", entities);
        console.log("Database is ready");
    } catch (error: any) {
        console.error("Failed to initialize database:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        // Don't exit - let server continue with basic endpoints
    }
}

// Initialize event system
async function initializeEventSystem() {
    try {
        console.log("Initializing event-driven architecture...");
        
        // Initialize notification event handler (this sets up event listeners)
        const handler = notificationEventHandler;
        console.log("Notification event handler initialized");
        
        // Test the notification system
        const testResult = await handler.testNotificationSystem();
        if (testResult) {
            console.log("✅ Event-driven notification system is ready");
        } else {
            console.warn("⚠️ Event-driven notification system has issues but will continue");
        }
        
        // Log event bus stats
        const stats = eventBus.getEventStats();
        console.log("Event bus stats:", stats);
        
    } catch (error: any) {
        console.error("Failed to initialize event system:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack
        });
        // Don't exit - let server continue
    }
}

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    // Initialize database and event system after server starts
    initializeDatabase().then(() => {
        initializeEventSystem();
    });
});