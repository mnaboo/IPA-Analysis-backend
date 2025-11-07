import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// ROUTERS
import loginRouter from "./routes/loginRouter";
import signUpRouter from "./routes/signUpRouter";
import adminRouter from "./routes/adminRouter";
import groupRouter from "./routes/userGroupRouter";              // ⬅️ USER (grupy)
import adminGroupsRouter from "./routes/adminGroupRouter";       // ⬅️ ADMIN (grupy)
import templateRouter from "./routes/templateRouter";            // ⬅️ Template CRUD
import testRouter, {routerAdmin as testAdminRouter}from "./routes/testRouter";                    // ⬅️ Testy z szablonów
import questionTemplateRouter from "./routes/questionTemplateRouter";  // ⬅️ Pytania do szablonów
import answerRouter, {routerAdmin as answersAdminRouter} from "./routes/answerRouter";                // ⬅️ Odpowiedzi / IPA

// Swagger
import { setupSwagger } from "./config/swagger";
import logoutRouter from "./routes/logoutRouter";

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

// ✅ Autoryzacja
app.use("/api/v1/signup", signUpRouter);
app.use("/api/v1/login", loginRouter);
app.use("/api/v1/logout", logoutRouter);

// ✅ USER endpoints
app.use("/api/v1/groups", groupRouter); // user view

// ✅ ADMIN endpoints
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/admin/groups", adminGroupsRouter); // admin only

// ✅ Templates and Tests
app.use("/api/v1/admin/templates", templateRouter); // admin only
app.use("/api/v1/tests", testRouter);
app.use("/api/v1/admin/tests", testAdminRouter); // admin only
app.use("/api/v1/admin/questions", questionTemplateRouter); // admin only

// ✅ Answers and IPA results
app.use("/api/v1/answers", answerRouter);
app.use("/api/v1/admin/answers", answersAdminRouter); //admin only

export default app;
