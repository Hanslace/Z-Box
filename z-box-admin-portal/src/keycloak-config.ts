import Keycloak from 'keycloak-connect';
import session from 'express-session';
import type { Request, Response, NextFunction } from 'express';

// Extend Express Session to include Keycloak token
declare module 'express-session' {
  interface SessionData {
    'keycloak-token': any;
  }
}

// Session store
const memoryStore = new session.MemoryStore();

// Session configuration
export const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
};

// Keycloak configuration
const keycloakConfig: any = {
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'z-box-admin-portal',
  bearerOnly: false,
  serverUrl: process.env.KEYCLOAK_SERVER_URL || 'http://localhost:8080',
  realm: process.env.KEYCLOAK_REALM || 'z-box',
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET || 'your-client-secret'
  }
};

// Initialize Keycloak
export const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Type for authenticated requests
export interface AuthenticatedRequest extends Request {
  kauth?: {
    grant?: {
      access_token: {
        content: {
          preferred_username: string;
          name?: string;
          email?: string;
          realm_access?: {
            roles: string[];
          };
        };
      };
    };
  };
}