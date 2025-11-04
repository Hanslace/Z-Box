import session from "express-session";
import dotenv from "dotenv";
import Keycloak from "keycloak-connect";

dotenv.config();

// one shared store for express-session and keycloak
const memoryStore = new session.MemoryStore();

let keycloak: Keycloak.Keycloak | null = null;

export function getSessionStore() {
  return memoryStore;
}

export function initKeycloak() {
  if (keycloak) return keycloak;

  // use any here because keycloak-connect types don't expose `credentials`
  const config: any = {
    realm: process.env.KEYCLOAK_REALM || "z-box",
    "auth-server-url":
      process.env.KEYCLOAK_AUTH_SERVER_URL || "http://10.10.0.1:8080",
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

export function getKeycloak() {
  return keycloak || initKeycloak();
}

export function ensureAuth(req: any, res: any, next: any) {
  const kc = getKeycloak();
  return kc.protect()(req, res, next);
}
