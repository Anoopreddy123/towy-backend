// src/services/geo-service.ts

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
dotenv.config();

export class GeoService {
    private db: Pool;

    constructor() {
        const hasDiscrete = !!process.env.GEOSPATIAL_DB_HOST;
        if (hasDiscrete) {
            console.log("GeoService connecting via fields:", {
                host: process.env.GEOSPATIAL_DB_HOST,
                port: process.env.GEOSPATIAL_DB_PORT,
                user: process.env.GEOSPATIAL_DB_USER,
                database: process.env.GEOSPATIAL_DB_NAME
            });
            this.db = new Pool({
                host: process.env.GEOSPATIAL_DB_HOST,
                port: process.env.GEOSPATIAL_DB_PORT ? parseInt(process.env.GEOSPATIAL_DB_PORT, 10) : 6543,
                user: process.env.GEOSPATIAL_DB_USER,
                password: process.env.GEOSPATIAL_DB_PASSWORD,
                database: process.env.GEOSPATIAL_DB_NAME || 'postgres',
                ssl: { rejectUnauthorized: false }
            });
        } else {
            console.log("GeoService connection string:", process.env.GEOSPATIAL_DB_URL); // Debug line
            this.db = new Pool({
                connectionString: process.env.GEOSPATIAL_DB_URL,
                ssl: {
                    rejectUnauthorized: false // Required for Supabase
                }
            });
        }
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
        
        // For now, return mock providers since we don't have real provider data
        // In a real app, this would query the providers table with PostGIS
        const mockProviders = [
            {
                id: 'provider-1',
                name: 'John Smith',
                businessName: 'John\'s Towing Service',
                services: ['towing', 'roadside_assistance'],
                distance: 2.5,
                isAvailable: true,
                phone: '(555) 123-4567',
                email: 'john@johnstowing.com'
            },
            {
                id: 'provider-2', 
                name: 'Mike Johnson',
                businessName: 'Quick Fix Auto Repair',
                services: ['towing', 'vehicle_recovery'],
                distance: 4.1,
                isAvailable: true,
                phone: '(555) 987-6543',
                email: 'mike@quickfixauto.com'
            },
            {
                id: 'provider-3',
                name: 'Sarah Wilson',
                businessName: 'Emergency Roadside Assistance',
                services: ['roadside_assistance', 'towing'],
                distance: 6.8,
                isAvailable: false,
                phone: '(555) 456-7890',
                email: 'sarah@emergencyroadside.com'
            }
        ];
        
        console.log('GeoService: Returning mock providers:', mockProviders.length);
        return mockProviders;
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