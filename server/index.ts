// Load environment variables
import { config } from 'dotenv';
config();

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { errorHandler } from "./middleware/errorHandler";
import { securityHeaders, rateLimit } from "./middleware/security";
import { startMedicineReminderScheduler } from "./scheduler";

const app = express();
const server = createServer(app);

// Security middleware
app.use(securityHeaders);

// Rate limiting - more lenient in development
const isDevelopment = process.env.NODE_ENV !== 'production';
app.use((req, res, next) => {
  // Skip rate limiting for static assets and in development
  if (isDevelopment || req.path.startsWith('/assets/') || req.path.startsWith('/@')) {
    return next();
  }
  // Apply rate limiting for production
  rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 })(req, res, next);
});

app.use(cors());
app.use(express.json());

// Register API routes
registerRoutes(app);

// Error handling middleware - must be after all routes
app.use(errorHandler);

const start = async () => {
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    
    // Start medicine reminder scheduler
    if (process.env.ENABLE_MEDICINE_REMINDERS !== 'false') {
      startMedicineReminderScheduler();
    } else {
      console.log('ℹ️ Medicine reminder scheduler disabled (ENABLE_MEDICINE_REMINDERS=false)');
    }
  });
};

// On Vercel we only export the app (no listen); locally we start the server
if (!process.env.VERCEL) {
  start();
}

export default app;