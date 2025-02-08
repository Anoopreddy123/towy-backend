import { Router } from 'express';
import { signup, login, getCurrentUser, loginProvider } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/provider/login', loginProvider);
router.get('/me', authMiddleware, getCurrentUser);
router.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

export const authRouter = router; 