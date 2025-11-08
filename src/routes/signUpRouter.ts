import express from "express";
import { register } from "../controllers/signUpController";
import { requestRegistration, confirmRegistration } from "../controllers/signUpVerifyController";
import { requireGuest } from "../middleware/auth";

const router = express.Router();
router.use(requireGuest);

/**
 * @swagger
 * /api/v1/signup/request:
 *   post:
 *     summary: Request account verification code
 *     tags: [Auth (login / logout / signup)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mail, password, repeatPassword]
 *             properties:
 *               mail:
 *                 type: string
 *                 example: 123456@stud.prz.edu.pl
 *               password:
 *                 type: string
 *               repeatPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code sent
 */
router.post("/request", requestRegistration);

/**
 * @swagger
 * /api/v1/signup/confirm:
 *   post:
 *     summary: Confirm registration with code
 *     tags: [Auth (login / logout / signup)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mail, code]
 *             properties:
 *               mail:
 *                 type: string
 *                 example: 123456@stud.prz.edu.pl
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Account created successfully
 */
router.post("/confirm", confirmRegistration);

// Stary endpoint (opcjonalny, można zostawić dla testów)
router.route("/").post(register);

export default router;
