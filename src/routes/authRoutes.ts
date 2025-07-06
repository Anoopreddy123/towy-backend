import { Router } from 'express';
import { signup, login, getCurrentUser, loginProvider } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Add error handling wrapper
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.post('/provider/login', loginProvider);
router.get('/me', authMiddleware, asyncHandler(getCurrentUser));
router.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

export { router as authRouter }; 