import express from 'express';
import { GeoService } from '../config/geo-services';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const geoService = new GeoService();

router.post('/signup', async (req, res) => {
    try {
        const { email, password, businessName, services } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await geoService.registerProvider({
            email,
            password: hashedPassword,
            businessName,
            services,
            latitude: req.body.latitude || 0,
            longitude: req.body.longitude || 0
        });
        res.json(result);
    } catch (error) {
        res.status(400).json({ 
            error: error instanceof Error ? error.message : 'Registration failed'
        });
    }
});

router.post('/provider/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await geoService.loginProvider(email, password);
        res.json(result);
    } catch (error) {
        res.status(400).json({ 
            error: error instanceof Error ? error.message : 'Login failed' 
        });
    }
});

export default router;