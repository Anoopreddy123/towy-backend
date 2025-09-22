import { Request, Response } from 'express';
import { simpleDbPool } from '../config/database';
import { GeoService } from '../config/geo-services';
import { eventBus } from '../events/EventBus';
import { v4 as uuidv4 } from 'uuid';
import { reverseGeocode } from '../services/geocodingService';

let geoService: any = null;

// Initialize GeoService when needed
function initializeGeoService() {
    if (!geoService) {
        geoService = new GeoService();
    }
}

export const createServiceRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceType, location, coordinates, description, vehicleType } = req.body;
        console.log('Creating service request with:', { serviceType, location, coordinates });

        // Validate service type (support all types used by the UI)
        const validServiceTypes = [
            'towing',
            'roadside_assistance',
            'vehicle_recovery',
            'battery_jump',
            'tire_change',
            'gas_delivery',
            'lockout',
            'mechanic'
        ];
        if (!validServiceTypes.includes(serviceType)) {
            res.status(400).json({ message: "Invalid service type" });
            return;
        }

        // Normalize coordinates to a "lat, lng" string
        let coordinatesText: string | null = null;
        let humanReadableLocation: string | null = location || null;
        if (typeof coordinates === 'string') {
            coordinatesText = coordinates;
        } else if (coordinates && typeof coordinates === 'object' &&
                   typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
            coordinatesText = `${coordinates.lat}, ${coordinates.lng}`;
            // Try reverse geocoding to a human-readable area name
            try {
                const result = await reverseGeocode(coordinates.lat, coordinates.lng);
                if (result?.display) {
                    humanReadableLocation = result.display;
                }
            } catch (e) {
                console.warn('Reverse geocoding failed, using raw location or coords string');
            }
        } else if (Array.isArray(coordinates) && coordinates.length === 2) {
            const [lat, lng] = coordinates;
            if (typeof lat === 'number' && typeof lng === 'number') {
                coordinatesText = `${lat}, ${lng}`;
                try {
                    const result = await reverseGeocode(lat, lng);
                    if (result?.display) {
                        humanReadableLocation = result.display;
                    }
                } catch (e) {
                    console.warn('Reverse geocoding failed, using raw location or coords string');
                }
            }
        }

        // Use GeoService's Supabase pool for inserting into geospatial DB
        initializeGeoService();

        // Determine which foreign key to populate based on role
        const isProvider = req.user?.role === 'provider';
        const userId = !isProvider ? req.user?.id : null;
        const providerId = isProvider ? req.user?.id : null;

        console.log('Insert FK resolution:', { isProvider, userId, providerId });

        const created = await geoService.createServiceRequest({
            serviceType,
            location: humanReadableLocation || location || coordinatesText || 'Unknown location',
            coordinatesText,
            description,
            vehicleType,
            userId,
            providerId,
        });

        console.log('Service request created successfully:', created);
        
        // Emit service request created event for notification system
        if (created && created.id) {
            // Debug: Log the raw request data
            console.log('Raw request body:', req.body);
            console.log('Extracted data:', { serviceType, location, coordinates, description, vehicleType });
            
            const serviceRequestEvent = {
                id: uuidv4(),
                type: 'service_request_created' as const,
                timestamp: new Date(),
                data: {
                    requestId: created.id,
                    userId: req.user?.id,
                    serviceType: serviceType,
                    location: humanReadableLocation || location || coordinatesText || 'Unknown location',
                    coordinates: coordinates,
                    description: description,
                    vehicleType: vehicleType
                }
            };
            
            console.log('Emitting service request created event:', serviceRequestEvent);
            eventBus.emitEvent(serviceRequestEvent);
        }
        
        res.status(201).json({ message: 'Service request created', service: created });
    } catch (error: any) {
        console.error('Create service error:', error);
        res.status(500).json({ 
            message: "Error creating service request",
            details: error?.message,
        });
    }
};

export const getAvailableProviders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceType, latitude, longitude, radius } = req.query;

        // Ensure latitude and longitude are provided
        if (!latitude || !longitude || !radius) {
            res.status(400).json({ message: "Latitude, longitude, and radius are required" });
            return;
        }

        // Use GeoService to find nearby providers
        initializeGeoService();
        const providers = await geoService.findNearbyProviders(
            parseFloat(latitude as string),
            parseFloat(longitude as string),
            parseFloat(radius as string),
            serviceType as string
        );

        console.log("Returning providers:", providers);
        res.json(providers);
    } catch (error: any) {
        console.error("Error finding service providers:", error);
        res.status(500).json({ message: "Error finding service providers" });
    }
};

export const getUserRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('Fetching requests for user:', req.user.id);
        // Use GeoService to fetch from Supabase
        initializeGeoService();
        const requests = await geoService.getUserRequests(req.user.id);
        console.log('Found requests:', requests.length, requests);
        res.json(requests);
    } catch (error: any) {
        console.error('Get user requests error:', error);
        res.status(500).json({ message: "Error fetching service requests" });
    }
};

export const updateServiceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log('Updating service status:', { id, status });

        // Use GeoService to update in Supabase
        initializeGeoService();
        const updated = await geoService.updateServiceStatus(id, status);
        
        if (!updated) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }
        
        res.json({ message: "Status updated", service: updated });
    } catch (error: any) {
        console.error('Update service status error:', error);
        res.status(500).json({ message: "Error updating service status" });
    }
};

export const submitQuote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const { quotedPrice } = req.body;

        const client = await simpleDbPool.connect();
        try {
            const result = await client.query(
                'UPDATE service_requests SET quoted_price = $1, provider_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
                [quotedPrice, req.user.id, serviceId]
            );
            
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            
            res.json({ message: "Quote submitted successfully", service: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Submit quote error:', error);
        res.status(500).json({ message: "Error submitting quote" });
    }
};

export const getServiceQuotes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceId } = req.params;
        
        const client = await simpleDbPool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM service_requests WHERE id = $1',
                [serviceId]
            );
            
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            
            res.json(result.rows[0]);
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Get service quotes error:', error);
        res.status(500).json({ message: "Error fetching quotes" });
    }
};

export const acceptQuote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const { providerId } = req.body;

        const client = await simpleDbPool.connect();
        try {
            const result = await client.query(
                'UPDATE service_requests SET status = $1, provider_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
                ['accepted', providerId, serviceId]
            );
            
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            
            res.json({ message: "Quote accepted", service: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Accept quote error:', error);
        res.status(500).json({ message: "Error accepting quote" });
    }
};

export const getProviderServices = async (req: Request, res: Response): Promise<void> => {
    try {
        const client = await simpleDbPool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM service_requests WHERE provider_id = $1 ORDER BY created_at DESC',
                [req.user.id]
            );
            res.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Get provider services error:', error);
        res.status(500).json({ message: "Error fetching provider services" });
    }
};

export const findNearbyProviders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { latitude, longitude, serviceType } = req.query;

        if (!latitude || !longitude || !serviceType) {
            res.status(400).json({ 
                message: "Missing required parameters",
                required: { latitude, longitude, serviceType }
            });
            return;
        }

        // Use GeoService to find nearby providers
        initializeGeoService();
        const providers = await geoService.findNearbyProviders(
            parseFloat(latitude as string),
            parseFloat(longitude as string),
            10, // Default radius of 10km
            serviceType as string
        );

        res.json(providers);
    } catch (error: any) {
        console.error('Find nearby providers error:', error);
        res.status(500).json({ message: "Error finding nearby providers" });
    }
};

export const notifyProvider = async (req: Request, res: Response): Promise<void> => {
    try {
        const { providerId, serviceRequestId } = req.body;
        
        // This would typically integrate with a notification service
        // For now, we'll just return a success message
        res.json({ 
            message: "Provider notified successfully",
            providerId,
            serviceRequestId
        });
    } catch (error: any) {
        console.error('Notify provider error:', error);
        res.status(500).json({ message: "Error notifying provider" });
    }
};

export const getServiceRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const client = await simpleDbPool.connect();
        try {
            const result = await client.query(
                `SELECT s.*, u.name AS customer_name, u.email AS customer_email
                 FROM service_requests s
                 LEFT JOIN users u ON u.id = s.user_id
                 WHERE s.id = $1`,
                [id]
            );
            
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            
            const row = result.rows[0];
            // Shape a response that includes a nested user object for convenience
            const shaped = {
                ...row,
                user: row.customer_name || row.customer_email ? {
                    name: row.customer_name || null,
                    email: row.customer_email || null
                } : null
            };
            res.json(shaped);
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Get service request error:', error);
        res.status(500).json({ message: "Error fetching service request" });
    }
};

export const getNearbyRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        // Provider-based nearby requests (50 miles by default)
        if (req.user?.role !== 'provider') {
            res.status(403).json({ message: 'Only providers can fetch nearby requests' });
            return;
        }

        initializeGeoService();
        const milesParam = req.query.miles ? parseFloat(req.query.miles as string) : 50;
        const requests = await geoService.getNearbyRequestsByProvider(req.user.id, milesParam);
        res.json(requests);
    } catch (error: any) {
        console.error('Get nearby requests error:', error);
        res.status(500).json({ message: "Error fetching nearby requests" });
    }
}; 