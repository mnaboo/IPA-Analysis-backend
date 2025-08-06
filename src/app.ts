import express from "express";
import loginRouter from "./routes/loginRouter";
import signUpRouter from "./routes/signUpRouter";
import cors from "cors";
import { setupSwagger } from './config/swagger';

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

setupSwagger(app);

app.use("/api/v1/signup", signUpRouter);
app.use("/api/v1/login", loginRouter);

export default app;