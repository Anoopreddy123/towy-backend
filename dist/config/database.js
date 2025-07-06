"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoDataSource = exports.simpleDbPool = exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const User_1 = require("../models/User");
const ServiceRequest_1 = require("../models/ServiceRequest");
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log("Connecting to database:", process.env.DATABASE_URL);
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    synchronize: true,
    entities: [User_1.User, ServiceRequest_1.ServiceRequest],
    migrationsRun: true,
    logging: true,
    extra: {
        ssl: true,
        // Serverless-friendly connection settings
        max: 1, // Limit connections for serverless
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        maxUses: 7500, // Recycle connections
    }
});
// Simple direct connection as fallback
exports.simpleDbPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
const Provider_1 = require("../entities/Provider");
exports.GeoDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.GEOSPATIAL_DB_URL,
    ssl: {
        rejectUnauthorized: false
    },
    synchronize: true,
    entities: [Provider_1.Provider],
    logging: ["query", "error"],
    extra: {
        ssl: true,
        // Serverless-friendly connection settings
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        maxUses: 7500,
    }
});
