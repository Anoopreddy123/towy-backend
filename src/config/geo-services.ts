// src/services/geo-service.ts

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
dotenv.config();

export class GeoService {
    private db: Pool;

    constructor() {
        // Always prefer connection string; ignore discrete GEOSPATIAL_DB_* fields
        const rawUrl = process.env.GEOSPATIAL_DB_URL || '';
        console.log('[GeoService] RAW GEOSPATIAL_DB_URL:', rawUrl);
        console.log('[GeoService] PGSSLMODE:', process.env.PGSSLMODE);
        console.log('[GeoService] NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);
        let connectionString = rawUrl;
        if (rawUrl && !/sslmode=/i.test(rawUrl)) {
            // Use no-verify to bypass chain issues in managed envs
            connectionString += (rawUrl.includes('?') ? '&' : '?') + 'sslmode=no-verify';
        }
        console.log('[GeoService] Connection string (normalized):', connectionString);
        this.db = new Pool({
            connectionString,
            ssl: { 
                rejectUnauthorized: false,
                checkServerIdentity: () => undefined
            }
        }); // SSL bypass configured
        console.log("DB connected"); // Debug line
        
        // Initialize tables asynchronously without blocking server startup
        this.initializeTables().catch(error => {
            console.error('GeoService initialization failed:', error);
            // Don't throw error - let server continue
        });
    }

    // Initialize tables
    private async initializeTables() {
        try {
            // Check if PostGIS is already installed
            const postgisCheck = await this.db.query(`
                SELECT * FROM pg_extension WHERE extname = 'postgis';
            `);
            
            if (postgisCheck.rows.length === 0) {
                try {
                    await this.db.query('CREATE EXTENSION IF NOT EXISTS postgis;');
                    console.log('PostGIS extension enabled successfully');
                } catch (error) {
                    console.error('Failed to create PostGIS extension:', error);
                    throw new Error('PostGIS extension could not be created. Please ensure it is enabled in your database.');
                }
            } else {
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

                -- Create service_requests table if not exists (stores all requests in geospatial DB)
                CREATE TABLE IF NOT EXISTS service_requests (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    service_type VARCHAR(100) NOT NULL,
                    location TEXT,
                    coordinates TEXT,
                    description TEXT,
                    vehicle_type VARCHAR(100),
                    status VARCHAR(50) DEFAULT 'pending',
                    quoted_price DECIMAL(10,2),
                    user_id UUID,
                    provider_id UUID,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_geo_service_requests_user_id ON service_requests(user_id);
                CREATE INDEX IF NOT EXISTS idx_geo_service_requests_provider_id ON service_requests(provider_id);
                CREATE INDEX IF NOT EXISTS idx_geo_service_requests_status ON service_requests(status);
            `);

            console.log('GeoService: Tables initialized successfully');
        } catch (error) {
            console.error('GeoService: Failed to initialize tables:', error);
            // Don't throw error - let server continue
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

    async createServiceRequest(data: {
        serviceType: string;
        location?: string;
        coordinatesText?: string | null;
        description?: string;
        vehicleType?: string;
        userId?: string | null;
        providerId?: string | null;
    }) {
        // Ensure user exists in Supabase if userId is provided
        if (data.userId) {
            await this.ensureUserExists(data.userId);
        }

        const result = await this.db.query(
            `INSERT INTO service_requests (
                service_type, location, coordinates, description, vehicle_type, status, user_id, provider_id, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
            [
                data.serviceType,
                data.location || null,
                data.coordinatesText || null,
                data.description || null,
                data.vehicleType || null,
                'pending',
                data.userId || null,
                data.providerId || null,
            ]
        );
        return result.rows[0];
    }

    private async ensureUserExists(userId: string) {
        try {
            // Check if user exists
            const checkResult = await this.db.query(
                'SELECT id FROM users WHERE id = $1',
                [userId]
            );

            if (checkResult.rows.length === 0) {
                // Create a minimal user record
                await this.db.query(
                    'INSERT INTO users (id, name, email, password, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
                    [userId, 'Unknown User', `user-${userId}@temp.com`, 'temp-password', 'customer']
                );
                console.log('Created minimal user record for ID:', userId);
            }
        } catch (error) {
            console.error('Error ensuring user exists:', error);
            // Don't throw - let the main operation continue
        }
    }

    async getUserRequests(userId: string) {
        console.log('GeoService: Fetching requests for user:', userId);
        try {
            const result = await this.db.query(
                'SELECT * FROM service_requests WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            
            console.log('GeoService: Raw DB result:', result.rows.length, 'rows');
            console.log('GeoService: Raw rows:', result.rows);
            
            const mapped = result.rows.map((row: any) => ({
                id: row.id,
                serviceType: row.service_type,
                location: row.location,
                status: row.status,
                description: row.description,
                createdAt: row.created_at,
            }));
            
            console.log('GeoService: Mapped result:', mapped);
            return mapped;
        } catch (error) {
            console.error('GeoService: Error fetching user requests:', error);
            throw error;
        }
    }

    async getServiceRequest(requestId: string) {
        const result = await this.db.query(
            'SELECT * FROM service_requests WHERE id = $1',
            [requestId]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const row = result.rows[0];
        return {
            id: row.id,
            serviceType: row.service_type,
            location: row.location,
            coordinates: row.coordinates,
            description: row.description,
            vehicleType: row.vehicle_type,
            status: row.status,
            createdAt: row.created_at,
        };
    }

    async findNearbyProviders(latitude: number, longitude: number, radius: number, serviceType: string) {
        console.log('GeoService: Finding providers near', latitude, longitude, 'radius:', radius, 'service:', serviceType);
        
        try {
            // First, let's debug - check if any providers exist at all
            const debugQuery = `SELECT id, business_name, email, services, is_available, location FROM providers LIMIT 5`;
            const debugResult = await this.db.query(debugQuery);
            console.log('GeoService: All providers in database:', debugResult.rows);
            
            // Query real providers from the database using PostGIS
            // Use a minimum radius of 100 meters to catch providers at the same location
            const minRadius = Math.max(radius, 0.1); // At least 100 meters
            
            const query = `
                SELECT 
                    id,
                    business_name,
                    email,
                    services,
                    is_available,
                    ST_Distance(
                        location::geometry,
                        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
                    ) / 1000 as distance_km
                FROM providers 
                WHERE 
                    ST_DWithin(
                        location::geography,
                        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                        $3 * 1000
                    )
                    AND is_available = true
                    AND (
                        $4 = ANY(services) OR 
                        'all' = ANY(services) OR 
                        'general' = ANY(services) OR
                        'towing' = ANY(services) -- Allow towing providers for any service type
                    )
                ORDER BY distance_km ASC
                LIMIT 20
            `;
            
            const result = await this.db.query(query, [latitude, longitude, minRadius, serviceType]);
            
            const providers = result.rows.map(row => ({
                id: row.id,
                name: row.business_name || 'Provider',
                businessName: row.business_name,
                email: row.email,
                phone: null, // No phone column in providers table
                services: row.services || [],
                distance: parseFloat(row.distance_km),
                isAvailable: row.is_available
            }));
            
            console.log(`GeoService: Found ${providers.length} real providers within ${radius}km`);
            return providers;
            
        } catch (error) {
            console.error('GeoService: Error querying providers:', error);
            console.log('GeoService: No providers found in database');
            return [];
        }
    }

    async updateServiceStatus(requestId: string, status: string) {
        console.log('GeoService: Updating service status:', { requestId, status });
        
        const result = await this.db.query(
            'UPDATE service_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, requestId]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const row = result.rows[0];
        return {
            id: row.id,
            serviceType: row.service_type,
            location: row.location,
            coordinates: row.coordinates,
            description: row.description,
            vehicleType: row.vehicle_type,
            status: row.status,
            createdAt: row.created_at,
        };
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
                process.env.JWT_SECRET || 'your_secret_key',
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

    async getNearbyRequestsByProvider(providerId: string, miles: number = 50) {
        // 1 mile = 1609.34 meters
        const meters = miles * 1609.34;

        // Ensure provider exists and get location
        const providerResult = await this.db.query(
            `SELECT location FROM providers WHERE id = $1`,
            [providerId]
        );

        if (providerResult.rows.length === 0) {
            throw new Error('Provider not found');
        }

        // Query pending service requests within radius of provider.location
        const requestsResult = await this.db.query(
            `SELECT 
                sr.*,
                ST_Distance(
                    p.location,
                    ST_MakePoint(
                        CAST(SPLIT_PART(sr.coordinates, ',', 2) AS FLOAT),
                        CAST(SPLIT_PART(sr.coordinates, ',', 1) AS FLOAT)
                    )::geography
                ) AS distance_meters
             FROM service_requests sr
             CROSS JOIN (SELECT location FROM providers WHERE id = $1) AS p
             WHERE sr.status = 'pending'
               AND sr.coordinates IS NOT NULL
               AND ST_DWithin(
                    p.location,
                    ST_MakePoint(
                        CAST(SPLIT_PART(sr.coordinates, ',', 2) AS FLOAT),
                        CAST(SPLIT_PART(sr.coordinates, ',', 1) AS FLOAT)
                    )::geography,
                    $2
               )
             ORDER BY distance_meters ASC`,
            [providerId, meters]
        );

        return requestsResult.rows.map((row: any) => ({
            id: row.id,
            serviceType: row.service_type,
            location: row.location,
            coordinates: row.coordinates,
            description: row.description,
            vehicleType: row.vehicle_type,
            status: row.status,
            createdAt: row.created_at,
            distanceMiles: row.distance_meters / 1609.34,
        }));
    }

    // Rest of your methods...
    // async findNearbyProviders() { /* ... */ }
    // async updateProviderLocation() { /* ... */ }
}

// Usage
const geoService = new GeoService();