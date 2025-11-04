import express from "express";
import path from "path";
import morgan from "morgan";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import session from "express-session";
import indexRouter from "./routes/index";
import authRouter from "./routes/auth";
import postureRouter from "./routes/posture";
import { initKeycloak } from "./middleware/keycloak";

dotenv.config();

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
  })
);

const keycloak = initKeycloak();
if (keycloak) {
  app.use(keycloak.middleware());
}

app.use("/public", express.static(path.join(__dirname, "..", "public")));

app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/api", postureRouter);

app.get("/views/:page", (req, res) => {
  const page = req.params.page;
  res.sendFile(path.join(__dirname, "..", "views", page));
});

export default app;
