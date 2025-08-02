import express from "express";
import { testApi } from "../controllers/testController";

const router = express.Router();

router.get("/test", testApi);

export default router;
