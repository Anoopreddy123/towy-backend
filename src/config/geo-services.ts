// src/services/geo-service.ts

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';
dotenv.config();

export class GeoService {
    private db: Pool;

    constructor() {
        console.log("DB URL:", process.env.GEOSPATIAL_DB_URL); // Debug line
        this.db = new Pool({
            connectionString: process.env.GEOSPATIAL_DB_URL,
            ssl: {
                rejectUnauthorized: false // Required for Supabase
            }
        });
        console.log("DB connected"); // Debug line
        this.initializeTables();
    }

    // Initialize tables
    private async initializeTables() {
        try {
            await this.db.query(`
                -- Enable PostGIS if not enabled
                CREATE EXTENSION IF NOT EXISTS postgis;

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
        } catch (error) {
            console.error('GeoService: Failed to initialize tables:', error);
            throw error; // Re-throw to ensure we know if initialization fails
        }
    }

    async registerProvider(data: {
        email: string;
        password: string;
        businessName: string;
        latitude: number;
        longitude: number;
        services: string[];
    }) {
        const hashedPassword = await hash(data.password, 10);
        
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

    async loginProvider(email: string, password: string) {
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
            const validPassword = await compare(password, provider.password);
            if (!validPassword) {
                throw new Error('Invalid password');
            }

            // Generate JWT token
            const token = sign(
                { 
                    id: provider.id, 
                    email: provider.email,
                    role: 'provider' 
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Remove password from response
            const { password: _, ...providerWithoutPassword } = provider;
            
            return { 
                token, 
                provider: providerWithoutPassword,
                message: 'Login successful'
            };
        } catch (error) {
            console.error('Login error:', error);
            throw error instanceof Error 
                ? error 
                : new Error('An unexpected error occurred during login');
        }
    }

    async getProviderById(id: string) {
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

    async updateProvider(id: string, updates: {
        businessName?: string;
        latitude?: number;
        longitude?: number;
        services?: string[];
        isAvailable?: boolean;
    }) {
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

    // Rest of your methods...
    // async findNearbyProviders() { /* ... */ }
    // async updateProviderLocation() { /* ... */ }
}

// Usage
const geoService = new GeoService();