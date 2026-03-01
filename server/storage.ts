import { db } from "./db";
import {
  serverConfigs,
  businesses,
  type ServerConfig,
  type InsertServerConfig,
  type Business,
  type InsertBusiness
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Server Configs
  getServerConfig(guildId: string): Promise<ServerConfig | undefined>;
  upsertServerConfig(config: InsertServerConfig): Promise<ServerConfig>;
  getAllServerConfigs(): Promise<ServerConfig[]>;
  updateServerConfigEmbedMessage(guildId: string, messageId: string): Promise<ServerConfig>;

  // Businesses
  getBusinesses(guildId: string): Promise<Business[]>;
  getBusinessByRole(guildId: string, roleId: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusinessStatus(id: number, isOnline: boolean, employeeId: string | null): Promise<Business>;
  getAllBusinesses(): Promise<Business[]>;
}

export class DatabaseStorage implements IStorage {
  async getServerConfig(guildId: string): Promise<ServerConfig | undefined> {
    const [config] = await db.select().from(serverConfigs).where(eq(serverConfigs.guildId, guildId));
    return config;
  }

  async upsertServerConfig(config: InsertServerConfig): Promise<ServerConfig> {
    const [existing] = await db.select().from(serverConfigs).where(eq(serverConfigs.guildId, config.guildId));
    if (existing) {
      const [updated] = await db.update(serverConfigs)
        .set(config)
        .where(eq(serverConfigs.guildId, config.guildId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(serverConfigs).values(config).returning();
      return created;
    }
  }

  async getAllServerConfigs(): Promise<ServerConfig[]> {
    return await db.select().from(serverConfigs);
  }

  async updateServerConfigEmbedMessage(guildId: string, messageId: string): Promise<ServerConfig> {
    const [updated] = await db.update(serverConfigs)
      .set({ businessesMessageId: messageId })
      .where(eq(serverConfigs.guildId, guildId))
      .returning();
    return updated;
  }

  async getBusinesses(guildId: string): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.guildId, guildId));
  }

  async getBusinessByRole(guildId: string, roleId: string): Promise<Business | undefined> {
    const [business] = await db.select()
      .from(businesses)
      .where(and(eq(businesses.guildId, guildId), eq(businesses.roleId, roleId)));
    return business;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [created] = await db.insert(businesses).values(business).returning();
    return created;
  }

  async updateBusinessStatus(id: number, isOnline: boolean, employeeId: string | null): Promise<Business> {
    const [updated] = await db.update(businesses)
      .set({ isOnline, employeeId })
      .where(eq(businesses.id, id))
      .returning();
    return updated;
  }

  async getAllBusinesses(): Promise<Business[]> {
    return await db.select().from(businesses);
  }
}

export const storage = new DatabaseStorage();
