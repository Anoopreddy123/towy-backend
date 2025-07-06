import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';

const router = Router();

// User management routes (admin only)
router.get('/', authMiddleware, checkRole(['admin']), getAllUsers);
router.get('/:id', authMiddleware, checkRole(['admin']), getUserById);
router.put('/:id', authMiddleware, checkRole(['admin']), updateUser);
router.delete('/:id', authMiddleware, checkRole(['admin']), deleteUser);

export const userRouter = router; 