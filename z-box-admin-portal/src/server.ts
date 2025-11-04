import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { keycloak, sessionConfig } from './keycloak-config.ts';
import type {  AuthenticatedRequest } from './keycloak-config.ts';
import indexRouter from './routes/index.ts';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../views')));

// Session middleware
app.use(session(sessionConfig));

// Keycloak middleware
app.use(keycloak.middleware());

// Routes
app.use('/', indexRouter);

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/dashboard', keycloak.protect(), (req: AuthenticatedRequest, res) => {
  // Pass user data to the dashboard
  const user = req.kauth?.grant?.access_token.content;
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

// Error handler
app.get('/error', (req, res) => {
  const error = req.query.error || 'An unexpected error occurred';
  res.sendFile(path.join(__dirname, '../views/error.html'));
});

// 404 handler
app.use((req, res) => {
  res.redirect('/error?error=Page not found');
});

app.listen(PORT, () => {
  console.log(`Z-Box Admin Portal running on http://localhost:${PORT}`);
  console.log(`Keycloak realm: ${process.env.KEYCLOAK_REALM}`);
  console.log(`Keycloak server: ${process.env.KEYCLOAK_SERVER_URL}`);
});