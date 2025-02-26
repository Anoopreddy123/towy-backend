import { Router } from 'express';
import { signup, login } from '../controllers/userController';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);

export const userRouter = router; 