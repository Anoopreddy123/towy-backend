"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginProvider = exports.updateProfile = exports.getCurrentUser = exports.login = exports.signup = void 0;
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const geo_services_1 = require("../config/geo-services");
// Initialize repository after DataSource is ready
let userRepository = null;
let geoService = null;
// Initialize repositories when database is ready
function initializeRepositories() {
    if (database_1.AppDataSource.isInitialized) {
        userRepository = database_1.AppDataSource.getRepository(User_1.User);
        geoService = new geo_services_1.GeoService();
    }
}
const signup = async (req, res) => {
    try {
        const { email, password, role, latitude, longitude, businessName, name } = req.body;
        if (role === 'provider') {
            // Providers go to GeoService DB
            if (!geoService) {
                geoService = new geo_services_1.GeoService();
            }
            const provider = await geoService.registerProvider({
                email,
                password,
                businessName,
                latitude,
                longitude,
                services: ['towing']
            });
            res.status(201).json({ message: "Provider registered", provider });
        }
        else {
            // Regular users go to main DB using direct connection
            const hashedPassword = await (0, bcryptjs_1.hash)(password, 10);
            const client = await database_1.simpleDbPool.connect();
            try {
                // Check if user already exists
                const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
                if (existingUser.rows.length > 0) {
                    res.status(400).json({ error: "User already exists" });
                    return;
                }
                // Insert new user
                const result = await client.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *', [name, email, hashedPassword, 'customer']);
                const user = result.rows[0];
                const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
                res.status(201).json({
                    message: "User registered successfully",
                    user: userWithoutPassword
                });
            }
            finally {
                client.release();
            }
        }
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            error: "Database error. Please try again later."
        });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    var _a;
    try {
        const { email, password, role } = req.body;
        if (role === 'provider') {
            // Check GeoService DB for providers
            if (!geoService) {
                geoService = new geo_services_1.GeoService();
            }
            try {
                const provider = await geoService.loginProvider(email, password);
                res.json(provider);
            }
            catch (err) {
                console.error('[provider/login] error', {
                    message: err === null || err === void 0 ? void 0 : err.message,
                    code: err === null || err === void 0 ? void 0 : err.code,
                    stack: err === null || err === void 0 ? void 0 : err.stack
                });
                if ((_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('self-signed')) {
                    res.status(503).json({ message: 'Upstream DB TLS error. Please retry shortly.' });
                    return;
                }
                res.status(401).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Unauthorized' });
            }
        }
        else {
            // Check main DB for users using direct connection
            const client = await database_1.simpleDbPool.connect();
            try {
                const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
                const user = result.rows[0];
                if (!user) {
                    res.status(401).json({ message: "Invalid credentials" });
                    return;
                }
                const validPassword = await (0, bcryptjs_1.compare)(password, user.password);
                if (!validPassword) {
                    res.status(401).json({ message: "Invalid credentials" });
                    return;
                }
                const token = (0, jsonwebtoken_1.sign)({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "your_secret_key", { expiresIn: "24h" });
                const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
                res.json({
                    message: "Login successful",
                    token,
                    user: userWithoutPassword
                });
            }
            finally {
                client.release();
            }
        }
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: "Database error. Please try again later."
        });
    }
};
exports.login = login;
const getCurrentUser = async (req, res) => {
    try {
        const { id, role } = req.user; // From auth middleware
        if (role === 'provider') {
            // Get from GeoService DB
            if (!geoService) {
                geoService = new geo_services_1.GeoService();
            }
            const provider = await geoService.getProviderById(id);
            res.json(provider);
        }
        else {
            // Get from main DB using direct connection
            const client = await database_1.simpleDbPool.connect();
            try {
                const result = await client.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
                const user = result.rows[0];
                if (!user) {
                    res.status(404).json({ error: "User not found" });
                    return;
                }
                res.json(user);
            }
            finally {
                client.release();
            }
        }
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            error: "Database error. Please try again later."
        });
    }
};
exports.getCurrentUser = getCurrentUser;
const updateProfile = async (req, res) => {
    try {
        const { id, role } = req.user;
        const updates = req.body;
        if (role === 'provider') {
            // Update in GeoService DB
            const provider = await geoService.updateProvider(id, updates);
            res.json(provider);
        }
        else {
            // Update in main DB
            const user = await userRepository.update(id, updates);
            res.json(user);
        }
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
};
exports.updateProfile = updateProfile;
const loginProvider = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!geoService) {
            geoService = new geo_services_1.GeoService();
        }
        const result = await geoService.loginProvider(email, password);
        // Structure the user data consistently
        const userData = {
            id: result.provider.id,
            name: result.provider.businessName, // Use businessName as the primary name
            email: result.provider.email,
            role: 'provider',
            businessName: result.provider.businessName,
            services: result.provider.services,
            location: result.provider.location,
            isAvailable: result.provider.isAvailable
        };
        const token = (0, jsonwebtoken_1.sign)({ userId: userData.id, role: 'provider' }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '24h' });
        res.json({
            message: "Login successful",
            token,
            user: userData
        });
    }
    catch (error) {
        console.error('Provider login error:', error);
        res.status(401).json({
            message: error instanceof Error ? error.message : "Invalid credentials"
        });
    }
};
exports.loginProvider = loginProvider;
