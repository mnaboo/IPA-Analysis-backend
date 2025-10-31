import express from 'express';
import { register } from '../controllers/signUpController';
import { requireGuest } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SignUp
 *   description: Endpoints for user registration
 */
router.use(requireGuest);
/**
 * @swagger
 * /api/v1/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [SignUp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *               - password
 *               - repeatPassword
 *             properties:
 *               mail:
 *                 type: string
 *                 example: 123456@stud.prz.edu.pl
 *               password:
 *                 type: string
 *                 example: test123
 *               repeatPassword:
 *                 type: string
 *                 example: test123
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: Missing fields or user already exists
 *       403:
 *         description: Passwords do not match
 */
router.route('/').post(register);

export default router;
