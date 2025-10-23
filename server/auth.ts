import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Password generation and hashing utilities
export function generatePassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one character from each required type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // Uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // Lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // Number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // Special
  
  // Fill remaining characters
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate password reset token
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

// Middleware functions
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  console.log("Authentication failed - no valid session found");
  return res.status(401).json({ message: "Unauthorized" });
}

export function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
}

export function requireSuperAdmin(req: any, res: any, next: any) {
  if (req.user?.isSuperAdmin) {
    return next();
  }
  res.status(403).json({ message: "Super admin access required" });
}

// Access control helper functions
export async function getAccessibleBusinessUnitIds(userId: string): Promise<string[]> {
  try {
    const user = await storage.getUser(userId);
    
    // Super admins have access to all business units
    if (user?.isSuperAdmin) {
      const allBusinessUnits = await storage.getAllBusinessUnits();
      return allBusinessUnits.map(unit => unit.id);
    }
    
    // Regular admins only have access to their assigned business units
    const userBusinessUnits = await storage.getUserBusinessUnits(userId);
    return userBusinessUnits.map(unit => unit.id);
  } catch (error) {
    console.error('Error getting accessible business unit IDs:', error);
    return [];
  }
}

// Middleware to attach accessible business unit IDs to requests
export async function attachAccessControl(req: any, res: any, next: any) {
  if (req.user) {
    try {
      const accessibleBusinessUnitIds = await getAccessibleBusinessUnitIds(req.user.id);
      req.accessibleBusinessUnitIds = accessibleBusinessUnitIds;
      req.isSuperAdmin = req.user.isSuperAdmin || false;
    } catch (error) {
      console.error('Error attaching access control:', error);
      req.accessibleBusinessUnitIds = [];
      req.isSuperAdmin = false;
    }
  }
  next();
}

// Helper to validate business unit access
export function validateBusinessUnitAccess(req: any, businessUnitId: string): boolean {
  if (req.isSuperAdmin) {
    return true;
  }
  return req.accessibleBusinessUnitIds?.includes(businessUnitId) || false;
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Scan full REPLIT_DOMAINS list for custom domain
  const domains = process.env.REPLIT_DOMAINS?.split(',').map(d => d.trim()) || [];
  const customDomain = domains.find(d => d.includes('ukteawallet.com'));
  const isProductionDomain = !!customDomain;
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "urban-ketl-secret-key-dev",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction || isProductionDomain, // Secure cookies for production domain even in dev mode
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // Allow redirects from Razorpay
      // Set domain to work across www and apex for production domain
      ...(isProductionDomain ? { domain: '.ukteawallet.com' } : {}),
    },
  };
  
  // Log session configuration for debugging
  console.log('=== SESSION CONFIGURATION ===');
  console.log('Available domains:', domains);
  console.log('Custom domain found:', customDomain || 'none');
  console.log('Cookie domain:', isProductionDomain ? '.ukteawallet.com' : 'default (host-only)');
  console.log('Secure cookies:', isProduction || isProductionDomain);

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy for email/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password || ""))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login error" });
        }

        // Explicitly save the session before responding
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Session error" });
          }

          // Check if user needs to reset password
          if (user.requiresPasswordReset) {
            return res.json({
              requiresPasswordReset: true,
              userId: user.id,
              message: "Password reset required",
            });
          }

          res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/auth');
    });
  });

  // Email configuration check endpoint (for debugging)
  app.get("/api/auth/email-status", isAuthenticated, async (req, res) => {
    if (!req.user?.isSuperAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const status = {
      configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
      host: process.env.EMAIL_HOST || 'Not set',
      port: process.env.EMAIL_PORT || 'Not set',
      user: process.env.EMAIL_USER ? '✓ Set' : '✗ Not set',
      password: process.env.EMAIL_PASSWORD ? '✓ Set' : '✗ Not set',
      fromName: process.env.EMAIL_FROM_NAME || 'Not set',
      nodeEnv: process.env.NODE_ENV || 'Not set'
    };
    
    res.json(status);
  });

  // Password management routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account exists, a reset email will be sent" });
      }

      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.setPasswordResetToken(user.id, resetToken, expiresAt);

      // In development, return the token directly
      if (process.env.NODE_ENV === "development") {
        console.log('Development mode - returning reset token directly');
        res.json({
          message: "Password reset token generated (development mode)",
          resetToken,
        });
      } else {
        // In production, send email
        console.log('Production mode - attempting to send password reset email to:', user.email);
        
        // Check if email is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
          console.error('Email credentials not configured in production');
          return res.status(500).json({ 
            error: "Email service not configured. Please contact support." 
          });
        }
        
        try {
          const { emailService } = await import('./services/emailService');
          console.log('Email service imported successfully');
          
          const emailResult = await emailService.sendPasswordResetEmail(user, resetToken);
          console.log('Email send result:', emailResult);
          
          if (!emailResult.success) {
            console.error('Failed to send password reset email:', emailResult.error);
            return res.status(500).json({ 
              error: "Failed to send reset email. Please contact support.",
              details: process.env.NODE_ENV === "development" ? emailResult.error : undefined
            });
          }
          
          console.log('Password reset email sent successfully to:', user.email);
          res.json({
            message: "Password reset instructions sent to your email",
          });
        } catch (emailError) {
          console.error('Error sending password reset email:', emailError);
          return res.status(500).json({ 
            error: "Failed to send reset email. Please contact support.",
            details: process.env.NODE_ENV === "development" ? String(emailError) : undefined
          });
        }
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);
      await storage.setPasswordResetStatus(user.id, false);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new passwords are required" });
      }

      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Use getUserByEmail to get the password field (getUser excludes it for security)
      const user = await storage.getUserByEmail(req.user.email);
      if (!user || !user.password) {
        return res.status(400).json({ error: "User not found or password not set" });
      }

      if (!(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.setPasswordResetStatus(user.id, false);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
}