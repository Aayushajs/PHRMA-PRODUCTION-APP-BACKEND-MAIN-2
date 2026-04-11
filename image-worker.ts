import dotenv from "dotenv";
import dns from "node:dns";
import mongoose from "mongoose";
import { startImageWorker, stopImageWorker } from "./workers/image.worker.js";
import { connectDB } from "./Databases/db.js";

dotenv.config({ path: "./config/.env" });
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function bootstrap(): Promise<void> {
  try {
    await connectDB();

    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB is not connected. Worker cannot process image jobs without database access.");
    }

    await startImageWorker();
  } catch (error) {
    console.error("Failed to start image worker:", error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down image worker...`);

  try {
    await stopImageWorker();
  } catch (error) {
    console.error("Failed to stop image worker cleanly:", error);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

void bootstrap();
