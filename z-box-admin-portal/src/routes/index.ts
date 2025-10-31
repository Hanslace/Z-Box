import express from 'express';
import { keycloak} from '../keycloak-config.ts';
import type { AuthenticatedRequest } from '../keycloak-config.ts';

const router = express.Router();

// API route to get user info (protected)
router.get('/api/user-info', keycloak.protect(), (req: AuthenticatedRequest, res) => {
  if (!req.kauth?.grant) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = req.kauth.grant.access_token.content;
  res.json({
    username: token.preferred_username,
    name: token.name || token.preferred_username,
    email: token.email,
    roles: token.realm_access?.roles || []
  });
});

// Logout endpoint
router.post('/api/logout', keycloak.protect(), (req: express.Request, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    const keycloakLogoutUrl = `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`;
    res.json({ logoutUrl: keycloakLogoutUrl });
  });
});

// Health check route (public)
router.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Z-Box Admin Portal',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;