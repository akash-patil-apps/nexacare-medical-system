// server/vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viteLogger = createLogger();

export function serveStatic(app: Express) {
  // In production, the built files will be at dist/client from the server's perspective
  const distPath = path.resolve(__dirname, "../../dist/client");
  
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the built client: ${distPath}`);
  }
  
  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

export async function setupVite(app: Express, server: Server) {
  const clientRoot = path.resolve(__dirname, "../client");
  
  const vite = await createViteServer({
    root: clientRoot,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // Suppress JSON parsing errors for CSS files
        if (msg.includes('Failed to parse JSON file') && msg.includes('.css')) {
          return;
        }
        console.error('Vite Error:', msg);
        viteLogger.error(msg, options);
      },
    },
    optimizeDeps: {
      exclude: ['@vitejs/plugin-react']
    },
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    }
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(clientRoot, "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      // Suppress JSON parsing errors for CSS files
      if (e instanceof Error && e.message.includes('Failed to parse JSON file') && e.message.includes('.css')) {
        console.log('Suppressed CSS JSON parsing error');
        return;
      }
      console.error('Vite transform error:', e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}