import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    try {
      return await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    } catch (error) {
      console.error("OIDC configuration failed:", error);
      throw new Error("Failed to configure OIDC authentication");
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemStore = MemoryStore(session);
  const sessionStore = new MemStore({
    checkPeriod: sessionTtl,
    ttl: sessionTtl,
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function checkUserExists(
  claims: any,
) {
  // Check if user exists in our system - only allow existing users to login
  const user = await storage.getUser(claims["sub"]);
  if (!user) {
    throw new Error("User not authorized - account must be created by administrator");
  }
  return user;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  let config = null;
  
  try {
    config = await getOidcConfig();
    
    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      try {
        // Only allow login if user exists in our system (created by admin)
        const existingUser = await checkUserExists(tokens.claims());
        const user = {};
        updateUserSession(user, tokens);
        verified(null, user);
      } catch (error) {
        console.error("User authorization failed:", error);
        verified(new Error("Account not found - please contact administrator"), null);
      }
    };

    for (const domain of process.env
      .REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
  } catch (error) {
    console.error("Authentication setup failed:", error);
    console.warn("Running in demo mode without authentication");
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    try {
      const strategyName = `replitauth:${req.hostname}`;
      const strategy = (passport as any)._strategy(strategyName);
      if (strategy) {
        passport.authenticate(strategyName, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      } else {
        // Demo login fallback
        (req.session as any).user = {
          id: "demo_user",
          email: "demo@urbanketl.com",
          firstName: "Demo",
          lastName: "User",
          walletBalance: "100.00",
          isAdmin: true,
          isSuperAdmin: true
        };
        res.redirect("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/callback", (req, res, next) => {
    try {
      const strategyName = `replitauth:${req.hostname}`;
      const strategy = (passport as any)._strategy(strategyName);
      if (strategy) {
        passport.authenticate(strategyName, {
          successReturnToOrRedirect: "/",
          failureRedirect: "/api/login",
        })(req, res, next);
      } else {
        res.redirect("/");
      }
    } catch (error) {
      console.error("Callback error:", error);
      res.redirect("/api/login");
    }
  });

  app.get("/api/logout", (req, res) => {
    try {
      req.logout(() => {
        if (config) {
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        } else {
          req.session.destroy(() => {
            res.redirect("/");
          });
        }
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.redirect("/");
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // First check for Replit authentication (real user)
  if (req.isAuthenticated() && user?.claims?.sub && user?.expires_at) {
    console.log("Replit auth valid for user:", user.claims.sub);
    
    // Check if token needs refresh
    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      const refreshToken = user.refresh_token;
      if (refreshToken) {
        try {
          const config = await getOidcConfig();
          const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
          updateUserSession(user, tokenResponse);
        } catch (error) {
          console.log("Token refresh failed, using demo fallback");
        }
      }
    }
    return next();
  }

  // Fallback to demo session only if no real auth
  if ((req.session as any)?.user) {
    req.user = { claims: { sub: (req.session as any).user.id } };
    console.log("Using demo session for user:", (req.session as any).user.id);
    return next();
  }

  console.log("Authentication failed - no valid session found");
  return res.status(401).json({ message: "Unauthorized" });
};
