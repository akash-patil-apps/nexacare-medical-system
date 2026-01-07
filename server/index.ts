// Load environment variables
import { config } from 'dotenv';
config();

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const server = createServer(app);

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
  });
};

start();