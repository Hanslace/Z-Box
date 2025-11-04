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
import { initKeycloak, getSessionStore } from "./middleware/keycloak";
import nftRouter from "./routes/nft";
import provisionRouter from "./routes/provision";
import client from "prom-client";

// enable default metrics



dotenv.config();

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// use the same store as keycloak
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
    store: getSessionStore(),
  })
);

const keycloak = initKeycloak();
app.use(keycloak.middleware());

app.use("/public", express.static(path.join(__dirname, "..", "public")));

app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/api", postureRouter);
app.use("/api", nftRouter);
app.use("/api", provisionRouter);

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});


app.get("/views/:page", (req, res) => {
  const page = req.params.page;
  res.sendFile(path.join(__dirname, "..", "views", page));
});

export default app;
