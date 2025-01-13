import { Router } from 'express';
import { signup, login, getCurrentUser } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

export const authRouter = router; 