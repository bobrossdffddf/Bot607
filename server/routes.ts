import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { getBotStatus, startBot } from "./bot";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.botStatus.get.path, async (req, res) => {
    res.json(getBotStatus());
  });

  app.get(api.servers.list.path, async (req, res) => {
    const servers = await storage.getAllServerConfigs();
    res.json(servers);
  });

  app.get(api.businesses.list.path, async (req, res) => {
    const allBusinesses = await storage.getAllBusinesses();
    res.json(allBusinesses);
  });

  // Start the bot asynchronously, do not wait for it to be fully ready before returning the server
  startBot().catch(console.error);

  return httpServer;
}
