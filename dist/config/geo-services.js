"use strict";
// src/services/geo-service.ts
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoService = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = require("bcrypt");
const jsonwebtoken_1 = require("jsonwebtoken");
dotenv_1.default.config();
class GeoService {
    constructor() {
        console.log("DB URL:", process.env.GEOSPATIAL_DB_URL); // Debug line
        this.db = new pg_1.Pool({
            connectionString: process.env.GEOSPATIAL_DB_URL,
            ssl: {
                rejectUnauthorized: false // Required for Supabase
            }
        });
        console.log("DB connected"); // Debug line
        this.initializeTables();
    }
    // Initialize tables
    async initializeTables() {
        try {
            // Check if PostGIS is already installed
            const postgisCheck = await this.db.query(`
                SELECT * FROM pg_extension WHERE extname = 'postgis';
            `);
            if (postgisCheck.rows.length === 0) {
                try {
                    await this.db.query('CREATE EXTENSION IF NOT EXISTS postgis;');
                    console.log('PostGIS extension enabled successfully');
                }
                catch (error) {
                    console.error('Failed to create PostGIS extension:', error);
                    throw new Error('PostGIS extension could not be created. Please ensure it is enabled in your database.');
                }
            }
            else {
                console.log('PostGIS extension is already installed');
            }
            // Then create the tables
            await this.db.query(`
                -- Create providers table if not exists
                CREATE TABLE IF NOT EXISTS providers (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    business_name TEXT NOT NULL,
                    location geography(POINT),
                    is_available BOOLEAN DEFAULT true,
                    services TEXT[],
                    last_updated TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                );

                -- Create spatial index
                CREATE INDEX IF NOT EXISTS provider_location_idx 
                ON providers 
                USING GIST (location);

                -- Create index for availability
                CREATE INDEX IF NOT EXISTS provider_availability_idx 
                ON providers(is_available);

                -- Create index for email lookups
                CREATE INDEX IF NOT EXISTS provider_email_idx 
                ON providers(email);
            `);
            console.log('GeoService: Tables initialized successfully');
        }
        catch (error) {
            console.error('GeoService: Failed to initialize tables:', error);
            throw error;
        }
    }
    async registerProvider(data) {
        const hashedPassword = await (0, bcrypt_1.hash)(data.password, 10);
        const result = await this.db.query(`
            INSERT INTO providers (
                email, password, business_name, 
                location, services
            )
            VALUES (
                $1, $2, $3, 
                ST_MakePoint($4, $5)::geography,
                $6
            )
            RETURNING id, email, business_name
        `, [
            data.email,
            hashedPassword,
            data.businessName,
            data.longitude,
            data.latitude,
            data.services
        ]);
        return result.rows[0];
    }
    async loginProvider(email, password) {
        try {
            // First check if the provider exists
            const result = await this.db.query(`
                SELECT 
                    id, 
                    email, 
                    password, 
                    business_name,
                    is_available,
                    services,
                    ST_X(location::geometry) as longitude,
                    ST_Y(location::geometry) as latitude
                FROM providers
                WHERE email = $1
            `, [email]);
            const provider = result.rows[0];
            if (!provider) {
                throw new Error('Provider not found');
            }
            // Verify password
            const validPassword = await (0, bcrypt_1.compare)(password, provider.password);
            if (!validPassword) {
                throw new Error('Invalid password');
            }
            // Generate JWT token
            const token = (0, jsonwebtoken_1.sign)({
                id: provider.id,
                email: provider.email,
                role: 'provider'
            }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
            // Remove password from response
            const { password: _ } = provider, providerWithoutPassword = __rest(provider, ["password"]);
            return {
                token,
                provider: providerWithoutPassword,
                message: 'Login successful'
            };
        }
        catch (error) {
            console.error('Login error:', error);
            throw error instanceof Error
                ? error
                : new Error('An unexpected error occurred during login');
        }
    }
    async getProviderById(id) {
        const result = await this.db.query(`
            SELECT id, email, business_name, services, is_available,
                   ST_X(location::geometry) as longitude,
                   ST_Y(location::geometry) as latitude
            FROM providers
            WHERE id = $1
        `, [id]);
        const provider = result.rows[0];
        if (!provider) {
            throw new Error('Provider not found');
        }
        return provider;
    }
    async updateProvider(id, updates) {
        const result = await this.db.query(`
            UPDATE providers
            SET 
                business_name = COALESCE($2, business_name),
                location = CASE 
                    WHEN $3 IS NOT NULL AND $4 IS NOT NULL 
                    THEN ST_MakePoint($3, $4)::geography 
                    ELSE location 
                END,
                services = COALESCE($5, services),
                is_available = COALESCE($6, is_available)
            WHERE id = $1
            RETURNING *
        `, [
            id,
            updates.businessName,
            updates.longitude,
            updates.latitude,
            updates.services,
            updates.isAvailable
        ]);
        return result.rows[0];
    }
}
exports.GeoService = GeoService;
// Usage
const geoService = new GeoService();
