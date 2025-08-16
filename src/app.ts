import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import loginRouter from "./routes/loginRouter";
import signUpRouter from "./routes/signUpRouter";
import adminRouter from "./routes/adminRouter";
import groupRouter from "./routes/userGroupRouter";              // ⬅️ NOWE (użytkownik)
import adminGroupsRouter from "./routes/adminGroupRouter";  // ⬅️ NOWE (admin)
import { setupSwagger } from "./config/swagger";

const app = express();

const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS")),
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

setupSwagger(app);

app.use("/api/v1/signup", signUpRouter);
app.use("/api/v1/login", loginRouter);

// USER groups endpoints
app.use("/api/v1/groups", groupRouter);            

// ADMIN endpoints
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/admin/groups", adminGroupsRouter);  

export default app;
