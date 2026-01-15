// src/test/setupEnv.ts
import dotenv from "dotenv";

dotenv.config({ path: "src/config.env" });

process.env.NODE_ENV = "test";
