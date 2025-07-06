"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyRequests = exports.getServiceRequest = exports.notifyProvider = exports.findNearbyProviders = exports.getProviderServices = exports.acceptQuote = exports.getServiceQuotes = exports.submitQuote = exports.updateServiceStatus = exports.getUserRequests = exports.getAvailableProviders = exports.createServiceRequest = void 0;
const database_1 = require("../config/database");
const geo_services_1 = require("../config/geo-services");
let geoService = null;
// Initialize GeoService when needed
function initializeGeoService() {
    if (!geoService) {
        geoService = new geo_services_1.GeoService();
    }
}
const createServiceRequest = async (req, res) => {
    try {
        const { serviceType, location, coordinates, description, vehicleType } = req.body;
        console.log('Creating service request with:', { serviceType, location, coordinates });
        // Validate service type
        const validServiceTypes = ['towing', 'roadside_assistance', 'vehicle_recovery'];
        if (!validServiceTypes.includes(serviceType)) {
            res.status(400).json({ message: "Invalid service type" });
            return;
        }
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query(`INSERT INTO service_requests (service_type, location, coordinates, description, vehicle_type, status, user_id, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`, [serviceType, location, coordinates, description, vehicleType, 'pending', req.user.id]);
            res.status(201).json({ message: 'Service request created', service: result.rows[0] });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ message: "Error creating service request" });
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
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('SELECT * FROM service_requests WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
            res.json(result.rows);
        }
        finally {
            client.release();
        }
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
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('UPDATE service_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);
            if (result.rows.length === 0) {
                res.status(404).json({ message: "Service request not found" });
                return;
            }
            res.json({ message: "Status updated", service: result.rows[0] });
        }
        finally {
            client.release();
        }
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
        const providers = await geoService.findNearbyProviders(parseFloat(latitude), parseFloat(longitude), 10, // Default radius of 10km
        serviceType);
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
    try {
        const { id } = req.params;
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('SELECT * FROM service_requests WHERE id = $1', [id]);
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
        console.error('Get service request error:', error);
        res.status(500).json({ message: "Error fetching service request" });
    }
};
exports.getServiceRequest = getServiceRequest;
const getNearbyRequests = async (req, res) => {
    try {
        const { latitude, longitude, radius = 10 } = req.query;
        if (!latitude || !longitude) {
            res.status(400).json({ message: "Latitude and longitude are required" });
            return;
        }
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query(`SELECT * FROM service_requests 
                 WHERE status = 'pending' 
                 AND ST_DWithin(
                     ST_SetSRID(ST_MakePoint(CAST(SPLIT_PART(coordinates, ',', 2) AS FLOAT), CAST(SPLIT_PART(coordinates, ',', 1) AS FLOAT)), 4326),
                     ST_SetSRID(ST_MakePoint($1, $2), 4326),
                     $3
                 )`, [parseFloat(longitude), parseFloat(latitude), parseFloat(radius) * 1000]);
            res.json(result.rows);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Get nearby requests error:', error);
        res.status(500).json({ message: "Error fetching nearby requests" });
    }
};
exports.getNearbyRequests = getNearbyRequests;
