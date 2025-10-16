import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeServices } from "./services";
import { autoSyncService } from "./services/autoSyncService";
import { challengeResponseService } from "./services/challengeResponseService";
import { upiSyncService } from "./services/upiSyncService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve tea machine simulator FIRST (no middleware, public access)
app.get('/tea-machine-simulator', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, '../tea-machine-simulator.html');
    console.log('Tea machine simulator path:', htmlPath);
    console.log('File exists:', fs.existsSync(htmlPath));
    
    if (fs.existsSync(htmlPath)) {
      res.setHeader('Content-Type', 'text/html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      res.send(htmlContent);
    } else {
      res.status(404).send('Tea machine simulator not found');
    }
  } catch (error) {
    console.error('Error serving tea machine simulator:', error);
    res.status(500).send('Error loading tea machine simulator');
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS and Security Headers for Razorpay compatibility
app.use((req, res, next) => {
  // Allow Razorpay to access necessary headers
  res.setHeader('Access-Control-Expose-Headers', 'x-rtb-fingerprint-id');
  
  // Allow credentials for session management
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Set origin based on request
  const origin = req.headers.origin;
  if (origin && (origin.includes('ukteawallet.com') || origin.includes('replit.dev'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // DON'T set CSP - let Razorpay handle its own security
  // CSP can block Razorpay's modal from rendering
  
  next();
});

// Serve static files from client/public directory
app.use(express.static(path.join(__dirname, '../client/public')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Initialize background services (email notifications, etc.)
    initializeServices();
    
    // Initialize Phase 3 & 4 services
    console.log('Initializing UrbanKetl services...');
    
    // Start Auto-Sync Service (Phase 3)
    try {
      await autoSyncService.startAutoSync();
      console.log('✅ Auto-Sync Service started successfully');
    } catch (error) {
      console.error('❌ Failed to start Auto-Sync Service:', error);
    }
    
    // Start UPI Sync Service (Phase 5)
    try {
      await upiSyncService.startDailySync();
      console.log('✅ UPI Sync Service started successfully (Daily sync at 8 PM IST)');
    } catch (error) {
      console.error('❌ Failed to start UPI Sync Service:', error);
    }
    
    // Challenge-Response Service (Phase 4) is already initialized
    console.log('✅ Challenge-Response Service initialized');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      // Handle timeout errors specifically
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED' || err.message?.includes('timed out')) {
        console.error('Timeout error:', {
          url: _req.originalUrl,
          method: _req.method,
          error: err.message,
          code: err.code
        });
        
        if (!res.headersSent) {
          return res.status(504).json({ 
            error: 'Gateway Timeout',
            message: 'The operation took too long to complete. Please try again.'
          });
        }
      }

      // Handle other errors
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Server error:", err);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });

    // Configure server-level timeouts for production resilience
    server.timeout = 30000;              // 30s socket inactivity timeout
    server.requestTimeout = 40000;       // 40s max request time
    server.headersTimeout = 35000;       // 35s headers timeout
    server.keepAliveTimeout = 65000;     // 65s keep-alive (higher than load balancer)

    // Handle timeout events
    server.on('timeout', (socket) => {
      console.error('Server timeout: Socket connection timed out');
      socket.destroy();
    });

    log('Server timeouts configured: request=40s, headers=35s, socket=30s, keepAlive=65s');
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
