import express from "express";
import loginRouter from "./routes/loginRouter";
import signUpRouter from "./routes/signUpRouter";
import cors from "cors";
import morgan from "morgan";
import { setupSwagger } from './config/swagger';

const app = express();

const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(morgan('dev'));

setupSwagger(app);

app.use("/api/v1/signup", signUpRouter);
app.use("/api/v1/login", loginRouter);

export default app;
