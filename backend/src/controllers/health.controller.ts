import type { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const state = mongoose.connection.readyState;
  const connected = state === 1;

  if (!connected) {
    throw new AppError("Database not connected", 503);
  }

  // Lightweight round-trip to confirm the server responds
  if (!mongoose.connection.db) {
    throw new AppError("Database not connected", 503);
  }
  await mongoose.connection.db.admin().ping();

  res.status(200).json({
    success: true,
    message: "OK",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        name: mongoose.connection.name,
        serverTime: new Date().toISOString(),
      },
    },
  });
});
