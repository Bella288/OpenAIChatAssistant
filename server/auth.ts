import passport from "passport";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { setupSession, sessionStore } from "./session";

// Extend Express.User to include our user type
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Set up auth
export function setupAuth(app: Express) {
  // Set up session with Postgres backing store
  setupSession(app);

  // Set up passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserProfile(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Replit Auth endpoint
  app.get("/api/auth/replit", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-replit-user-id"];
      const username = req.headers["x-replit-user-name"];

      if (!userId || !username) {
        return res.status(401).json({ message: "Not authenticated with Replit" });
      }

      // Find or create user
      let user = await storage.getUserByUsername(username as string);

      if (!user) {
        user = await storage.createUser({
          username: username as string,
          // Using Replit user ID as password since we don't need passwords with Replit Auth
          password: userId as string,
        });
      }

      // Log user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login" });
        }
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Replit auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Update user profile
  app.patch("/api/user/profile", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = (req.user as SelectUser).id;
      const updatedUser = await storage.updateUserProfile(userId, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
}