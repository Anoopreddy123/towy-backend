import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/User";
import { ServiceRequest } from "../models/ServiceRequest";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
console.log("Connecting to database:", process.env.DATABASE_URL); 

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    synchronize: true,
    entities: [User, ServiceRequest],
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
export const simpleDbPool = new Pool({
    connectionString: process.env.GEOSPATIAL_DB_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
}
);

import { Provider } from "../entities/Provider";

export const GeoDataSource = new DataSource({
    type: "postgres",
    url: process.env.GEOSPATIAL_DB_URL,
    ssl: {
        rejectUnauthorized: false
    },
    synchronize: true,
    entities: [Provider],
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
