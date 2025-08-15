import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '../models/user';
import { listUsers, getUser, setUserRole, deleteUser } from '../controllers/adminController';

const router = Router();

// Wszystko poniżej tylko dla zalogowanych adminów
router.use(requireAuth, requireRole(Role.Admin));

router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id/role', setUserRole);
router.delete('/users/:id', deleteUser);

export default router;
