"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const geo_services_1 = require("../config/geo-services");
const bcrypt_1 = __importDefault(require("bcrypt"));
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
const geoService = new geo_services_1.GeoService();
const corsOptions = {
    origin: [
        'https://towy-ui.vercel.app',
        'http://localhost:3000',
        /\.vercel\.app$/
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};
router.post('/signup', (0, cors_1.default)(corsOptions), async (req, res) => {
    try {
        const { email, password, businessName, services } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const result = await geoService.registerProvider({
            email,
            password: hashedPassword,
            businessName,
            services,
            latitude: req.body.latitude || 0,
            longitude: req.body.longitude || 0
        });
        res.json(result);
    }
    catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Registration failed'
        });
    }
});
router.post('/provider/login', (0, cors_1.default)(corsOptions), authController_1.loginProvider);
exports.default = router;
