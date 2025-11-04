import { Router } from "express";
import { ensureAuth } from "../middleware/keycloak";
import { NftStatsService } from "../services/NftStatsService";

const router = Router();
const svc = new NftStatsService();

router.get("/nft-stats", ensureAuth, (req, res) => {
  const stats = svc.getStats();
  res.json(stats);
});

export default router;
