import express from "express";
import loginRouter from "./routes/loginRouter";
import signUpRouter from "./routes/signUpRouter"
import cors from "cors";
import { setupSwagger } from './config/swagger';

const app = express();

setupSwagger(app);

app.use(cors());
app.use(express.json());

app.use("/api/v1/signup", signUpRouter);
app.use("/api/v1/login", loginRouter);

export default app;