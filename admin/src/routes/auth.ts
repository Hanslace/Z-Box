import { Router } from "express";
import { keycloakInstance } from "../middleware/keycloak";

const router = Router();

router.get("/login", (req, res) => {
  if (!keycloakInstance) {
    return res.status(500).send("Keycloak not initialized");
  }
  return (keycloakInstance as any).protect()(req, res, () => {
    res.redirect("/");
  });
});

router.get("/logout", (req, res) => {
  if (!keycloakInstance) {
    return res.redirect("/");
  }
  const host = req.headers.host;
  const redirect = `${req.protocol}://${host}`;
  return (keycloakInstance as any).logout(req, res, redirect);
});

export default router;
