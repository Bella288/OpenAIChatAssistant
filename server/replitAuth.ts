import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  console.warn("Environment variable REPLIT_DOMAINS not provided. Authentication might not work properly.");
}

// Cache the OIDC config for better performance
const getOidcConfig = memoize(
  async () => {
    // Ensure REPL_ID exists
    if (!process.env.REPL_ID) {
      console.warn("REPL_ID environment variable is missing");
    }
    
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID || "fallback-id" // Provide fallback for development
    );
  },
  { maxAge: 3600 * 1000 } // Cache for 1 hour
);

// Function to update user session with tokens
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Function to upsert user in database
async function upsertUser(claims: any) {
  return await storage.upsertUser({
    id: claims["sub"],
    username: claims["username"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    bio: claims["bio"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Ensure session secret is set
  const sessionSecret = process.env.SESSION_SECRET || require("crypto").randomBytes(32).toString("hex");
  if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET not set in environment; using a less secure fallback for development only");
  }
  
  // Session configuration
  const sessionConfig: session.SessionOptions = {
    store: storage.sessionStore,
    secret: [sessionSecret], // Use array to satisfy type requirements
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  };

  // In production, ensure cookies are secure and set sameSite policy
  if (process.env.NODE_ENV === "production") {
    if (sessionConfig.cookie) {
      sessionConfig.cookie.secure = true;
      sessionConfig.cookie.sameSite = "none"; // Allow cross-site cookies for authentication
    }
  }

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = {}; // Cast to any to avoid type issues
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user as Express.User);
  };

  // Set up strategies for all domains
  const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access", // Use space-separated string
        callbackURL: `https://${domain}/api/callback`,
      } as any, // Cast to any to avoid type issues
      verify,
    );
    passport.use(strategy);
  }

  // For local development
  if (domains.length === 0) {
    const localDomain = process.env.NODE_ENV === "production" ? "app.replit.dev" : "localhost";
    const strategy = new Strategy(
      {
        name: `replitauth:${localDomain}`,
        config,
        scope: "openid email profile offline_access", // Use space-separated string
        callbackURL: `http://${localDomain}:3000/api/callback`,
      } as any, // Cast to any to avoid type issues
      verify,
    );
    passport.use(strategy);
  }

  // Serialize and deserialize user for session storage
  passport.serializeUser((user: Express.User, cb) => {
    cb(null, user as any);
  });
  
  passport.deserializeUser((user: any, cb) => {
    cb(null, user as Express.User);
  });

  // Login route
  app.get("/api/login", (req, res, next) => {
    const hostname = req.hostname;
    const strategy = `replitauth:${hostname}`;
    
    // Fall back to a known strategy if the exact hostname's strategy doesn't exist
    // Note: Typescript doesn't know about _strategies but it's used in passport
    const passportAny = passport as any;
    const availableStrategies = Object.keys(passportAny._strategies || {})
      .filter(s => s.startsWith('replitauth:'));
    
    const useStrategy = passportAny._strategies?.[strategy] ? strategy : availableStrategies[0];
    
    if (!useStrategy) {
      return res.status(500).json({ 
        error: "No authentication strategy available",
        message: "No authentication strategy is available for this domain"
      });
    }
    
    passport.authenticate(useStrategy, {
      prompt: "login consent",
    })(req, res, next);
  });

  // Callback route for after authentication with Replit
  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname;
    const strategy = `replitauth:${hostname}`;
    
    // Fall back to a known strategy if the exact hostname's strategy doesn't exist
    const passportAny = passport as any;
    const availableStrategies = Object.keys(passportAny._strategies || {})
      .filter(s => s.startsWith('replitauth:'));
    
    const useStrategy = passportAny._strategies?.[strategy] ? strategy : availableStrategies[0];
    
    if (!useStrategy) {
      return res.status(500).json({ 
        error: "No authentication strategy available",
        message: "No authentication strategy is available for this domain"
      });
    }
    
    passport.authenticate(useStrategy, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID || "fallback-id", // Provide fallback for development
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // User info route
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    console.error("Error refreshing token:", error);
    return res.redirect("/api/login");
  }
};