import { Router } from "express";
import { ProvisionController } from "../controllers/ProvisionController";
import { ensureAuth } from "../middleware/keycloak";

const router = Router();
const controller = new ProvisionController();

// admin only
router.post("/provision", ensureAuth, (req, res) => controller.provision(req, res));

export default router;
