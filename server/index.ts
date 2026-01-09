import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import betterSqlite3SessionStore from "better-sqlite3-session-store";
import { handleDemo } from "./routes/demo";
import { authRoutes } from "./routes/auth";
import { moodRoutes } from "./routes/moods";
import { journalRoutes } from "./routes/journal";
import { goalRoutes } from "./routes/goals";
import { streakRoutes } from "./routes/streaks";
import { db, initDatabase } from "./db";

const SqliteStore = betterSqlite3SessionStore(session);

export function createServer() {
  const app = express();

  // Initialize DB
  initDatabase();

  // Middleware
  app.use(cors({
    origin: true, // Allow all origins for dev, or specify client URL
    credentials: true, // Allow cookies
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Session Setup
  app.use(
    session({
      store: new SqliteStore({
        client: db,
        expired: {
          clear: true,
          intervalMs: 900000 // ms = 15min
        }
      }),
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production", // Set true in production
        sameSite: "lax",
      },
      name: "nistha.sid",
    })
  );

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/moods", moodRoutes);
  app.use("/api/journal", journalRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/streaks", streakRoutes);

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  return app;
}
