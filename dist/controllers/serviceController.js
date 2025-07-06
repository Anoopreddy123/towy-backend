"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyRequests = exports.getServiceRequest = exports.notifyProvider = exports.findNearbyProviders = exports.getProviderServices = exports.acceptQuote = exports.getServiceQuotes = exports.submitQuote = exports.updateServiceStatus = exports.getUserRequests = exports.getAvailableProviders = exports.createServiceRequest = void 0;
const database_1 = require("../config/database");
const ServiceRequest_1 = require("../models/ServiceRequest");
const User_1 = require("../models/User");
const Provider_1 = require("../entities/Provider");
const serviceRepository = database_1.AppDataSource.getRepository(ServiceRequest_1.ServiceRequest);
const userRepository = database_1.AppDataSource.getRepository(User_1.User);
const providerRepository = database_1.GeoDataSource.getRepository(Provider_1.Provider);
const createServiceRequest = async (req, res) => {
    try {
        const { serviceType, location, coordinates, description, vehicleType } = req.body;
        console.log('Creating service request with:', { serviceType, location, coordinates });
        // Validate service type
        if (!Object.values(ServiceRequest_1.ServiceType).includes(serviceType)) {
            res.status(400).json({ message: "Invalid service type" });
            return;
        }
        const service = serviceRepository.create({
            serviceType,
            location,
            coordinates,
            description,
            vehicleType,
            status: "pending",
            user: req.user
        });
        await serviceRepository.save(service);
        res.status(201).json({ message: 'Service request created', service });
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
        const providers = await userRepository
            .createQueryBuilder("user")
            .where("user.role = :role", { role: "provider" })
            .andWhere("user.services @> ARRAY[:serviceType]", { serviceType })
            .andWhere(`ST_DWithin(
                    ST_SetSRID(ST_MakePoint(user.longitude, user.latitude), 4326),
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
                    :radius
                )`, { longitude, latitude, radius })
            .getMany();
        console.log("Returning providers:", providers); // This is where the log is printed
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
        const requests = await serviceRepository.find({
            where: { user: { id: req.user.id } },
            order: { createdAt: 'DESC' }
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching service requests" });
    }
};
exports.getUserRequests = getUserRequests;
const updateServiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const service = await serviceRepository.findOne({
            where: { id },
            relations: ['user']
        });
        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }
        service.status = status;
        await serviceRepository.save(service);
        res.json({ message: "Status updated", service });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating service status" });
    }
};
exports.updateServiceStatus = updateServiceStatus;
// Add endpoint for providers to submit quotes
const submitQuote = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { quotedPrice } = req.body;
        const service = await serviceRepository.findOne({
            where: { id: serviceId }
        });
        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }
        service.quotedPrice = quotedPrice;
        service.provider = req.user;
        await serviceRepository.save(service);
        res.json({ message: "Quote submitted successfully", service });
    }
    catch (error) {
        res.status(500).json({ message: "Error submitting quote" });
    }
};
exports.submitQuote = submitQuote;
// Get all quotes for a service request
const getServiceQuotes = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const service = await serviceRepository.findOne({
            where: { id: serviceId },
            relations: ['provider']
        });
        res.json(service);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching quotes" });
    }
};
exports.getServiceQuotes = getServiceQuotes;
// Accept a quote
const acceptQuote = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { providerId } = req.body;
        const service = await serviceRepository.findOne({
            where: { id: serviceId }
        });
        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }
        service.status = "accepted";
        service.provider = { id: providerId };
        await serviceRepository.save(service);
        res.json({ message: "Quote accepted", service });
    }
    catch (error) {
        res.status(500).json({ message: "Error accepting quote" });
    }
};
exports.acceptQuote = acceptQuote;
// Get provider's active services
const getProviderServices = async (req, res) => {
    try {
        const services = await serviceRepository.find({
            where: { provider: { id: req.user.id } },
            relations: ['user'],
            order: { createdAt: 'DESC' }
        });
        res.json(services);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching provider services" });
    }
};
exports.getProviderServices = getProviderServices;
// Add this function to find nearby providers
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
        console.log('Finding providers with params:', { latitude, longitude, serviceType });
        //await GeoDataSource.initialize();
        const providerRepository = database_1.GeoDataSource.getRepository(Provider_1.Provider);
        console.log("Provider Repository:", providerRepository);
        const providers = await providerRepository
            .createQueryBuilder("provider")
            .where("provider.isAvailable = :isAvailable", { isAvailable: true })
            .andWhere(`ST_DWithin(
                    ST_SetSRID(ST_MakePoint(provider.longitude, provider.latitude), 4326),
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
                    50000  -- 50 km radius
                )`, { longitude, latitude })
            .andWhere("provider.services @> ARRAY[:serviceType]", { serviceType })
            .getMany();
        console.log('Found providers:', providers);
        if (!providers.length) {
            res.json([]);
            return;
        }
        const nearbyProviders = providers
            .filter(provider => {
            if (!provider.location) {
                console.log(`Provider ${provider.business_name} has no location`);
                return false;
            }
            return true;
        })
            // console.log(point); // This will 
            .map(provider => {
            // const distance = calculateDistance(
            //     Number(latitude),
            //     Number(longitude),
            //     provider.,  // Assuming these fields exist in the Provider entity
            //     provider.longitude
            // );
            const distance = provider.location;
            console.log(`Provider ${provider.business_name} is ${distance}km away`);
            return Object.assign(Object.assign({}, provider), { password: undefined, distance });
        });
        // .filter(provider => {
        //     const hasService = provider.services?.includes(serviceType as string);
        //     console.log(`Provider ${provider.name}: hasService=${hasService}`);
        //     return hasService;
        // })
        // .sort((a, b) => a.distance - b.distance);
        console.log('Returning providers:', nearbyProviders);
        res.json(nearbyProviders);
    }
    catch (error) {
        console.error('Error finding providers:', error);
        res.status(500).json({
            message: "Error finding nearby providers",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
exports.findNearbyProviders = findNearbyProviders;
// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}
const notifyProvider = async (req, res) => {
    try {
        const { requestId, providerId } = req.body;
        const service = await serviceRepository.findOne({
            where: { id: requestId }
        });
        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }
        // Add the provider to notified providers list
        service.notifiedProviders = [...(service.notifiedProviders || []), providerId];
        await serviceRepository.save(service);
        res.json({ message: "Provider notified successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error notifying provider" });
    }
};
exports.notifyProvider = notifyProvider;
const getServiceRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await serviceRepository.findOne({
            where: { id },
            relations: ['user']
        });
        if (!service) {
            res.status(404).json({ message: "Service request not found" });
            return;
        }
        console.log('Found service request:', service);
        res.json(service);
    }
    catch (error) {
        console.error('Error fetching service request:', error);
        res.status(500).json({ message: "Error fetching service request" });
    }
};
exports.getServiceRequest = getServiceRequest;
// Add this new function
const getNearbyRequests = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        const maxDistance = 50; // kilometers
        const requests = await serviceRepository.find({
            where: { status: "pending" },
            relations: ['user']
        });
        const nearbyRequests = requests
            .filter(request => request.coordinates)
            .map(request => {
            const distance = calculateDistance(Number(latitude), Number(longitude), request.coordinates.lat, request.coordinates.lng);
            return Object.assign(Object.assign({}, request), { distance });
        })
            .filter(request => request.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance);
        res.json(nearbyRequests);
    }
    catch (error) {
        console.error('Error finding nearby requests:', error);
        res.status(500).json({ message: "Error finding nearby requests" });
    }
};
exports.getNearbyRequests = getNearbyRequests;
