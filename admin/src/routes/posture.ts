import { Router } from "express";
import { PostureController } from "../controllers/PostureController";
import { ensureAuth } from "../middleware/keycloak";

const router = Router();
const controller = new PostureController();

router.post("/posture-check",  (req, res) => controller.check(req, res));
router.get("/posture-report", ensureAuth, (req, res) => controller.report(req, res));

export default router;
