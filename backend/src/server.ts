import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { syncUserIndexes } from "./models/User.js";
import { startCronJobs } from "./services/cronJobs.js";
import { initSocketAuth, setNotificationIo } from "./socket/index.js";

async function start(): Promise<void> {
  try {
    await connectDb();
    await syncUserIndexes();
    startCronJobs();

    const server = createServer(app);
    const io = new Server(server, {
      cors: {
        origin: env.frontendUrl,
        credentials: true,
      },
    });

    initSocketAuth(io);
    setNotificationIo(io);

    server.listen(env.port, () => {
      const hostHint = env.isProduction
        ? `port ${env.port}`
        : `http://localhost:${env.port}`;
      console.log(`API running on ${hostHint}`);
      console.log(`Health check: /api/health`);
      console.log(`CORS origin: ${env.frontendUrl}`);
      console.log("Socket.io ready");
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to start server:", message);
    process.exit(1);
  }
}

void start();
