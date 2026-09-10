import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Node on Windows often fails mongodb+srv SRV lookups against local/router DNS
 * (querySrv ECONNREFUSED). Prefer public resolvers for Atlas hostnames.
 */
function ensureReliableDns(): void {
  if (!env.mongoUri.startsWith("mongodb+srv://")) {
    return;
  }

  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
    // If setServers is unavailable, mongoose will use the system resolver.
  }
}

export async function connectDb(): Promise<typeof mongoose> {
  ensureReliableDns();

  mongoose.connection.on("error", (err) => {
    console.error("Unexpected MongoDB connection error:", err);
  });

  await mongoose.connect(env.mongoUri, {
    // Prefer IPv4 — avoids some dual-stack / local DNS issues on Windows
    family: 4,
    serverSelectionTimeoutMS: 15000,
    dbName: env.mongoDbName,
  });

  const dbName = mongoose.connection.name;
  console.log(`MongoDB connected (${dbName})`);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export default mongoose;
