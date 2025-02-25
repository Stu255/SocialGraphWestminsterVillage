import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser, apiTokens, insertApiTokenSchema } from "@db/schema";
import { db } from "@db";
import { eq, and } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    if (!storedPassword.includes('.')) {
      return false;
    }
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

export async function validateApiToken(token: string) {
  try {
    const [apiToken] = await db
      .select()
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.token, token),
          eq(apiTokens.isActive, true)
        )
      )
      .limit(1);

    if (!apiToken) {
      return null;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, apiToken.userId))
      .limit(1);

    return user;
  } catch (error) {
    console.error("Error validating API token:", error);
    return null;
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, password } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username },
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
    }

    const cb = (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username },
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }

      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }

    res.status(401).send("Not logged in");
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).send("Email address is required");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      res.json({
        message: "If an account exists with this email, you will receive password reset instructions.",
      });

      if (user) {
        console.log(`Password reset requested for user: ${username}`);
      }
    } catch (error) {
      res.json({
        message: "If an account exists with this email, you will receive password reset instructions.",
      });
    }
  });

  app.post("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).send("Both current and new passwords are required");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      const isMatch = await crypto.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).send("Current password is incorrect");
      }

      const hashedPassword = await crypto.hash(newPassword);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).send("Failed to change password");
    }
  });

  // API Token Management
  app.post("/api/tokens/create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Token name is required" });
      }

      const token = randomUUID();

      const [apiToken] = await db
        .insert(apiTokens)
        .values({
          userId: req.user.id,
          token,
          name,
          isActive: true,
          createdAt: new Date()
        })
        .returning();

      res.json({
        id: apiToken.id,
        name: apiToken.name,
        token,
        createdAt: apiToken.createdAt
      });
    } catch (error) {
      console.error("Error creating API token:", error);
      res.status(500).json({ error: "Failed to create API token" });
    }
  });

  app.get("/api/tokens", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const tokens = await db
        .select({
          id: apiTokens.id,
          name: apiTokens.name,
          createdAt: apiTokens.createdAt,
          isActive: apiTokens.isActive
        })
        .from(apiTokens)
        .where(eq(apiTokens.userId, req.user.id));

      res.json(tokens);
    } catch (error) {
      console.error("Error fetching API tokens:", error);
      res.status(500).json({ error: "Failed to fetch API tokens" });
    }
  });

  app.delete("/api/tokens/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      await db
        .update(apiTokens)
        .set({ isActive: false })
        .where(
          and(
            eq(apiTokens.id, parseInt(req.params.id)),
            eq(apiTokens.userId, req.user.id)
          )
        );

      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking API token:", error);
      res.status(500).json({ error: "Failed to revoke API token" });
    }
  });
}

export async function apiAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Invalid authentication method" });
  }

  const token = authHeader.substring(7);
  const user = await validateApiToken(token);

  if (!user) {
    return res.status(401).json({ error: "Invalid API token" });
  }

  req.user = user;
  next();
}