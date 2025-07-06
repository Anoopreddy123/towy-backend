"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const geo_services_1 = require("../config/geo-services");
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
exports.authRouter = router;
const geoService = new geo_services_1.GeoService();
router.post('/signup', async (req, res) => {
    try {
        const { email, password, businessName, services } = req.body;
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
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
router.post('/provider/login', authController_1.loginProvider);
