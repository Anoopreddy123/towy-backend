"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyRequests = exports.getServiceRequest = exports.notifyProvider = exports.findNearbyProviders = exports.getProviderServices = exports.acceptQuote = exports.getServiceQuotes = exports.submitQuote = exports.updateServiceStatus = exports.getUserRequests = exports.getAvailableProviders = exports.createServiceRequest = void 0;
const database_1 = require("../config/database");
const geo_services_1 = require("../config/geo-services");
const EventBus_1 = require("../events/EventBus");
const uuid_1 = require("uuid");
const geocodingService_1 = require("../services/geocodingService");
let geoService = null;
// Initialize GeoService when needed
function initializeGeoService() {
    if (!geoService) {
        geoService = new geo_services_1.GeoService();
    }
}
const createServiceRequest = async (req, res) => {
    var _a, _b, _c, _d;
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
        let coordinatesText = null;
        let humanReadableLocation = location || null;
        if (typeof coordinates === 'string') {
            coordinatesText = coordinates;
        }
        else if (coordinates && typeof coordinates === 'object' &&
            typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
            coordinatesText = `${coordinates.lat}, ${coordinates.lng}`;
            // Try reverse geocoding to a human-readable area name
            try {
                const result = await (0, geocodingService_1.reverseGeocode)(coordinates.lat, coordinates.lng);
                if (result === null || result === void 0 ? void 0 : result.display) {
                    humanReadableLocation = result.display;
                }
            }
            catch (e) {
                console.warn('Reverse geocoding failed, using raw location or coords string');
            }
        }
        else if (Array.isArray(coordinates) && coordinates.length === 2) {
            const [lat, lng] = coordinates;
            if (typeof lat === 'number' && typeof lng === 'number') {
                coordinatesText = `${lat}, ${lng}`;
                try {
                    const result = await (0, geocodingService_1.reverseGeocode)(lat, lng);
                    if (result === null || result === void 0 ? void 0 : result.display) {
                        humanReadableLocation = result.display;
                    }
                }
                catch (e) {
                    console.warn('Reverse geocoding failed, using raw location or coords string');
                }
            }
        }
        // Use GeoService's Supabase pool for inserting into geospatial DB
        initializeGeoService();
        // Determine which foreign key to populate based on role
        const isProvider = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'provider';
        const userId = !isProvider ? (_b = req.user) === null || _b === void 0 ? void 0 : _b.id : null;
        const providerId = isProvider ? (_c = req.user) === null || _c === void 0 ? void 0 : _c.id : null;
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
                id: (0, uuid_1.v4)(),
                type: 'service_request_created',
                timestamp: new Date(),
                data: {
                    requestId: created.id,
                    userId: (_d = req.user) === null || _d === void 0 ? void 0 : _d.id,
                    serviceType: serviceType,
                    location: humanReadableLocation || location || coordinatesText || 'Unknown location',
                    coordinates: coordinates,
                    description: description,
                    vehicleType: vehicleType
                }
            };
            console.log('Emitting service request created event:', serviceRequestEvent);
            EventBus_1.eventBus.emitEvent(serviceRequestEvent);
        }
        res.status(201).json({ message: 'Service request created', service: created });
    }
    catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            message: "Error creating service request",
            details: error === null || error === void 0 ? void 0 : error.message,
        });
    }
};
exports.createServiceRequest = createServiceRequest;
const getAvailableProviders = async (req, res) => {
    try {
        const { serviceType, latitude, longitude, radius } = req.query;
        // Ensure latitude and longitude are provided
        if (!latitude || !longitude || !radius) {
            res.status(400).json({ message: "Latitude, longitude, and radius are required" });
            return;
        }
        // Use GeoService to find nearby providers
        initializeGeoService();
        const providers = await geoService.findNearbyProviders(parseFloat(latitude), parseFloat(longitude), parseFloat(radius), serviceType);
        console.log("Returning providers:", providers);
        res.json(providers);
    }
    catch (error) {
        console.error("Error finding service providers:", error);
        res.status(500).json({ message: "Error finding service providers" });
    }
};
exports.getAvailableProviders = getAvailableProviders;
const getUserRequests = async (req, res) => {
    try {
        console.log('Fetching requests for user:', req.user.id);
        // Use GeoService to fetch from Supabase
        initializeGeoService();
        const requests = await geoService.getUserRequests(req.user.id);
        console.log('Found requests:', requests.length, requests);
        res.json(requests);
    }
    catch (error) {
        console.error('Get user requests error:', error);
        res.status(500).json({ message: "Error fetching service requests" });
    }
};
exports.getUserRequests = getUserRequests;
const updateServiceStatus = async (req, res) => {
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
    }
    catch (error) {
        console.error('Update service status error:', error);
        res.status(500).json({ message: "Error updating service status" });
    }
};
exports.updateServiceStatus = updateServiceStatus;
const submitQuote = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { quotedPrice } = req.body;
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('UPDATE service_requests SET quoted_price = $1, provider_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *', [quotedPrice, req.user.id, serviceId]);
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            res.json({ message: "Quote submitted successfully", service: result.rows[0] });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Submit quote error:', error);
        res.status(500).json({ message: "Error submitting quote" });
    }
};
exports.submitQuote = submitQuote;
const getServiceQuotes = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('SELECT * FROM service_requests WHERE id = $1', [serviceId]);
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            res.json(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Get service quotes error:', error);
        res.status(500).json({ message: "Error fetching quotes" });
    }
};
exports.getServiceQuotes = getServiceQuotes;
const acceptQuote = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { providerId } = req.body;
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('UPDATE service_requests SET status = $1, provider_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *', ['accepted', providerId, serviceId]);
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            res.json({ message: "Quote accepted", service: result.rows[0] });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Accept quote error:', error);
        res.status(500).json({ message: "Error accepting quote" });
    }
};
exports.acceptQuote = acceptQuote;
const getProviderServices = async (req, res) => {
    try {
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('SELECT * FROM service_requests WHERE provider_id = $1 ORDER BY created_at DESC', [req.user.id]);
            res.json(result.rows);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Get provider services error:', error);
        res.status(500).json({ message: "Error fetching provider services" });
    }
};
exports.getProviderServices = getProviderServices;
const findNearbyProviders = async (req, res) => {
    try {
        const { latitude, longitude, serviceType, radius } = req.query;
        console.log('Find nearby providers params:', { latitude, longitude, serviceType, radius });
        if (!latitude || !longitude || latitude === 'undefined' || longitude === 'undefined') {
            res.status(400).json({
                message: "Valid latitude and longitude are required",
                received: { latitude, longitude, serviceType, radius }
            });
            return;
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const radiusKm = radius ? parseFloat(radius) : 10;
        if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
            res.status(400).json({
                message: "Invalid numeric values for coordinates or radius",
                parsed: { lat, lng, radiusKm }
            });
            return;
        }
        // Use GeoService to find nearby providers
        initializeGeoService();
        const providers = await geoService.findNearbyProviders(lat, lng, radiusKm, serviceType || 'all');
        res.json(providers);
    }
    catch (error) {
        console.error('Find nearby providers error:', error);
        res.status(500).json({ message: "Error finding nearby providers" });
    }
};
exports.findNearbyProviders = findNearbyProviders;
const notifyProvider = async (req, res) => {
    try {
        const { providerId, serviceRequestId } = req.body;
        // This would typically integrate with a notification service
        // For now, we'll just return a success message
        res.json({
            message: "Provider notified successfully",
            providerId,
            serviceRequestId
        });
    }
    catch (error) {
        console.error('Notify provider error:', error);
        res.status(500).json({ message: "Error notifying provider" });
    }
};
exports.notifyProvider = notifyProvider;
const getServiceRequest = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query(`SELECT s.*, u.name AS customer_name, u.email AS customer_email
                 FROM service_requests s
                 LEFT JOIN users u ON u.id = s.user_id
                 WHERE s.id = $1`, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            const row = result.rows[0];
            // Parse coordinates string to { lat, lng } when possible
            let coordinatesParsed = null;
            if (typeof row.coordinates === 'string') {
                // Try to parse as JSON first (format: {"lat": 33.79, "lng": -118.13})
                if (row.coordinates.startsWith('{') && row.coordinates.includes('"lat"') && row.coordinates.includes('"lng"')) {
                    try {
                        const parsed = JSON.parse(row.coordinates);
                        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
                            coordinatesParsed = { lat: parsed.lat, lng: parsed.lng };
                        }
                    }
                    catch (e) {
                        console.warn('Failed to parse coordinates as JSON:', e);
                    }
                }
                // Fallback to comma-separated format (format: "33.79, -118.13")
                else if (row.coordinates.includes(',') && !coordinatesParsed) {
                    const parts = row.coordinates.split(',');
                    if (parts.length === 2) {
                        const lat = parseFloat(parts[0].trim());
                        const lng = parseFloat(parts[1].trim());
                        if (Number.isFinite(lat) && Number.isFinite(lng)) {
                            coordinatesParsed = { lat, lng };
                        }
                    }
                }
            }
            // Shape a response that includes a nested user object and normalized fields
            const shaped = {
                id: row.id,
                serviceType: (_a = row.service_type) !== null && _a !== void 0 ? _a : row.serviceType,
                location: row.location,
                coordinates: coordinatesParsed,
                description: row.description,
                vehicleType: (_b = row.vehicle_type) !== null && _b !== void 0 ? _b : row.vehicleType,
                status: row.status,
                createdAt: (_c = row.created_at) !== null && _c !== void 0 ? _c : row.createdAt,
                user: row.customer_name || row.customer_email ? {
                    name: row.customer_name || null,
                    email: row.customer_email || null
                } : null
            };
            res.json(shaped);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Get service request error:', error);
        res.status(500).json({ message: "Error fetching service request" });
    }
};
exports.getServiceRequest = getServiceRequest;
const getNearbyRequests = async (req, res) => {
    var _a;
    try {
        // Provider-based nearby requests (50 miles by default)
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'provider') {
            res.status(403).json({ message: 'Only providers can fetch nearby requests' });
            return;
        }
        initializeGeoService();
        const milesParam = req.query.miles ? parseFloat(req.query.miles) : 50;
        const requests = await geoService.getNearbyRequestsByProvider(req.user.id, milesParam);
        res.json(requests);
    }
    catch (error) {
        console.error('Get nearby requests error:', error);
        res.status(500).json({ message: "Error fetching nearby requests" });
    }
};
exports.getNearbyRequests = getNearbyRequests;
