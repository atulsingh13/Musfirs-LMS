import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Needed for correct client IPs / rate limits behind nginx, load balancers, etc.
if (env.isProduction) {
  app.set("trust proxy", 1);
}

/** Allowed browser origins. Localhost only in non-production. */
const allowedOrigins = new Set(
  [
    env.frontendUrl,
    env.websiteOrigin,
    ...(env.isProduction
      ? []
      : [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ]),
  ].filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, Postman) send no Origin
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
