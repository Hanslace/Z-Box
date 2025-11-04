import { Router } from "express";
import { getKeycloak } from "../middleware/keycloak";

const router = Router();

router.get("/login", (req, res) => {
  const kc = getKeycloak();
  return kc.protect()(req, res, () => res.redirect("/"));
});

router.get("/logout", (req, res) => {
  const kc = getKeycloak();
  const host = req.headers.host;
  const redirectUri = `${req.protocol}://${host}/`;
  const logoutUrl = kc.logoutUrl(redirectUri);
  return res.redirect(logoutUrl);
});

export default router;
