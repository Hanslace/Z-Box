import Keycloak from "keycloak-connect";
import session from "express-session";
import dotenv from "dotenv";

dotenv.config();

let keycloak: Keycloak.Keycloak | null = null;

export function initKeycloak() {
  if (keycloak) return keycloak;

  const memoryStore = new session.MemoryStore();

  const config: any = {
    realm: process.env.KEYCLOAK_REALM || "z-box",
    "auth-server-url": process.env.KEYCLOAK_AUTH_SERVER_URL || "http://localhost:8080",
    "ssl-required": "none",
    resource: process.env.KEYCLOAK_CLIENT_ID || "zbox-admin",
    credentials: {
      secret: process.env.KEYCLOAK_CLIENT_SECRET || "REPLACE_ME",
    },
    "confidential-port": 0,
  };

  keycloak = new Keycloak({ store: memoryStore }, config);
  return keycloak;
}

export const keycloakInstance = keycloak;

export function ensureAuth(req: any, res: any, next: any) {
  const kc = initKeycloak();
  if (!kc) {
    return res.status(500).send("Keycloak not available");
  }
  return kc.protect()(req, res, next);
}
