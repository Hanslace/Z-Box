import { Router } from "express";
import path from "path";
import { ensureAuth } from "../middleware/keycloak";

const router = Router();

router.get("/", ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "views", "dashboard.html"));
});

router.get("/posture", ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "views", "posture.html"));
});

export default router;
