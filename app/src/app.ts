import express from "express";
//import loginRouter from "./routes/loginRouter";
import testRouter from "./routes/testRouter";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Express on Vercel"));

//app.use("/api/v1/login", loginRouter);
app.use("/api", testRouter); //test api

export default app;