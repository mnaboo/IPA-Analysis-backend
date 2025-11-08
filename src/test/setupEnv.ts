// src/test/setupEnv.ts
import dotenv from "dotenv";

dotenv.config({ path: "src/config.env" });

// Możesz też wymusić tryb testowy:
process.env.NODE_ENV = "test";
