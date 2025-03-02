import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import stripeRouter from './stripe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const port = process.env.PORT || 3333;
const domain = process.env.DOMAIN || 'http://localhost:5173';

// Configure CORS before routes
app.use(cors({
  origin: domain,
  credentials: true
}));

// Parse raw body for Stripe webhooks
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Parse JSON for regular routes
app.use(express.json());

// Mount Stripe routes
app.use('/api/stripe', stripeRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`CORS enabled for domain: ${domain}`);
});