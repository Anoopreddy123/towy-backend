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
const userRepository = database_1.AppDataSource.getRepository(User_1.User);
const geoService = new geo_services_1.GeoService();
const signup = async (req, res) => {
    try {
        const { email, password, role, latitude, longitude, businessName } = req.body;
        if (role === 'provider') {
            // Providers go to GeoService DB
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
            // Regular users go to main DB
            const user = await userRepository.save({
                name: req.body.name,
                email,
                password: await (0, bcryptjs_1.hash)(password, 10),
                role: 'customer'
            });
            res.status(201).json({ message: "User registered", user });
        }
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (role === 'provider') {
            // Check GeoService DB for providers
            const provider = await geoService.loginProvider(email, password);
            res.json(provider);
        }
        else {
            // Check main DB for users
            const user = await userRepository.findOne({ where: { email } });
            console.log("User found:", user ? "Yes" : "No");
            console.log("Stored hashed password:", user === null || user === void 0 ? void 0 : user.password);
            console.log("Provided password:", password);
            if (!user) {
                res.status(401).json({ message: "Invalid credentials" });
                return;
            }
            const validPassword = await (0, bcryptjs_1.compare)(password, user.password);
            console.log("Password comparison result:", validPassword);
            if (!validPassword) {
                res.status(401).json({ message: "Invalid credentials" });
                return;
            }
            const token = (0, jsonwebtoken_1.sign)({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "24h" });
            const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
            res.json({
                message: "Login successful",
                token,
                user: userWithoutPassword
            });
        }
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
};
exports.login = login;
const getCurrentUser = async (req, res) => {
    try {
        const { id, role } = req.user; // From auth middleware
        if (role === 'provider') {
            // Get from GeoService DB
            const provider = await geoService.getProviderById(id);
            res.json(provider);
        }
        else {
            // Get from main DB
            const user = await userRepository.findOne({ where: { id } });
            res.json(user);
        }
    }
    catch (error) {
        res.status(500).json({ error: error });
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
        const token = (0, jsonwebtoken_1.sign)({ userId: userData.id, role: 'provider' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
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
