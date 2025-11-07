import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/User";
import { ServiceRequest } from "../models/ServiceRequest";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const rawPrimaryDbUrl = process.env.DATABASE_URL || '';
const rawGeoDbUrl = process.env.GEOSPATIAL_DB_URL || '';

console.log("Connecting to database:", rawPrimaryDbUrl);

export const AppDataSource = new DataSource({
    type: "postgres",
    url: rawPrimaryDbUrl,
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

// Normalize connection strings so sslmode=no-verify is appended when missing
function normalizeConnectionString(url: string) {
    if (!url) {
        return url;
    }
    if (/sslmode=/i.test(url)) {
        return url;
    }
    return `${url}${url.includes('?') ? '&' : '?'}sslmode=no-verify`;
}

const normalizedPrimaryDbUrl = normalizeConnectionString(rawPrimaryDbUrl);
const normalizedGeoDbUrl = normalizeConnectionString(rawGeoDbUrl);

if (!normalizedPrimaryDbUrl) {
    console.warn('[database] DATABASE_URL is not defined. simpleDbPool will fall back to GEOSPATIAL_DB_URL.');
}

const simpleDbConnectionString = normalizedPrimaryDbUrl || normalizedGeoDbUrl;

if (!simpleDbConnectionString) {
    console.error('[database] No database connection string available for simpleDbPool. Please set DATABASE_URL or GEOSPATIAL_DB_URL.');
}

// Simple direct connection as fallback (primary application database)
export const simpleDbPool = new Pool({
    connectionString: simpleDbConnectionString,
    ssl: {
        rejectUnauthorized: false
    },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

import { Provider } from "../entities/Provider";

export const GeoDataSource = new DataSource({
    type: "postgres",
    url: normalizedGeoDbUrl || normalizedPrimaryDbUrl,
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
