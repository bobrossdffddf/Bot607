import fs from "fs";
import path from "path";
import {
  serverConfigs,
  businesses,
  type ServerConfig,
  type InsertServerConfig,
  type Business,
  type InsertBusiness
} from "@shared/schema";

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
  deleteBusinessByName(guildId: string, name: string): Promise<boolean>;
  getAllBusinesses(): Promise<Business[]>;
}

export class FileStorage implements IStorage {
  private configPath = path.resolve("data", "configs.json");
  private businessPath = path.resolve("data", "businesses.json");
  private configs: Map<string, ServerConfig>;
  private businesses: Map<number, Business>;
  private currentBusinessId: number;

  constructor() {
    if (!fs.existsSync("data")) {
      fs.mkdirSync("data");
    }

    this.configs = new Map();
    this.businesses = new Map();
    this.currentBusinessId = 1;

    this.loadData();
  }

  private loadData() {
    if (fs.existsSync(this.configPath)) {
      try {
        const stats = fs.statSync(this.configPath);
        if (stats.size > 0) {
          const raw = fs.readFileSync(this.configPath, "utf-8").trim();
          if (raw) {
            const data = JSON.parse(raw);
            Object.entries(data).forEach(([key, val]) => this.configs.set(key, val as ServerConfig));
          }
        }
      } catch (e) {
        console.warn("Could not parse configs.json, starting fresh.", e);
      }
    }
    if (fs.existsSync(this.businessPath)) {
      try {
        const stats = fs.statSync(this.businessPath);
        if (stats.size > 0) {
          const raw = fs.readFileSync(this.businessPath, "utf-8").trim();
          if (raw) {
            const data = JSON.parse(raw);
            data.forEach((b: Business) => {
              this.businesses.set(b.id, b);
              if (b.id >= this.currentBusinessId) this.currentBusinessId = b.id + 1;
            });
          }
        }
      } catch (e) {
        console.warn("Could not parse businesses.json, starting fresh.", e);
      }
    }
  }

  private saveData() {
    fs.writeFileSync(this.configPath, JSON.stringify(Object.fromEntries(this.configs)));
    fs.writeFileSync(this.businessPath, JSON.stringify(Array.from(this.businesses.values())));
  }

  async getServerConfig(guildId: string): Promise<ServerConfig | undefined> {
    return this.configs.get(guildId);
  }

  async upsertServerConfig(config: InsertServerConfig): Promise<ServerConfig> {
    const fullConfig: ServerConfig = {
      ...config,
      businessesMessageId: config.businessesMessageId ?? null
    };
    this.configs.set(config.guildId, fullConfig);
    this.saveData();
    return fullConfig;
  }

  async getAllServerConfigs(): Promise<ServerConfig[]> {
    return Array.from(this.configs.values());
  }

  async updateServerConfigEmbedMessage(guildId: string, messageId: string): Promise<ServerConfig> {
    const config = this.configs.get(guildId);
    if (!config) throw new Error("Config not found");
    config.businessesMessageId = messageId;
    this.saveData();
    return config;
  }

  async getBusinesses(guildId: string): Promise<Business[]> {
    return Array.from(this.businesses.values()).filter(b => b.guildId === guildId);
  }

  async getBusinessByRole(guildId: string, roleId: string): Promise<Business | undefined> {
    return Array.from(this.businesses.values()).find(b => b.guildId === guildId && b.roleId === roleId);
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const id = this.currentBusinessId++;
    const newBusiness: Business = {
      ...business,
      id,
      isOnline: false,
      employeeId: null
    };
    this.businesses.set(id, newBusiness);
    this.saveData();
    return newBusiness;
  }

  async updateBusinessStatus(id: number, isOnline: boolean, employeeId: string | null): Promise<Business> {
    const business = this.businesses.get(id);
    if (!business) throw new Error("Business not found");
    
    business.isOnline = isOnline;
    if (isOnline && employeeId) {
      if (!business.employeeIds) business.employeeIds = [];
      if (!business.employeeIds.includes(employeeId)) {
        business.employeeIds.push(employeeId);
      }
    } else if (!isOnline) {
      business.employeeIds = [];
    }
    
    this.saveData();
    return business;
  }

  async removeEmployeeFromBusiness(id: number, employeeId: string): Promise<Business> {
    const business = this.businesses.get(id);
    if (!business) throw new Error("Business not found");
    
    if (business.employeeIds) {
      business.employeeIds = business.employeeIds.filter(id => id !== employeeId);
      if (business.employeeIds.length === 0) {
        business.isOnline = false;
      }
    }
    
    this.saveData();
    return business;
  }

  async deleteBusinessByName(guildId: string, name: string): Promise<boolean> {
    const business = Array.from(this.businesses.values()).find(b => b.guildId === guildId && b.name === name);
    if (business) {
      this.businesses.delete(business.id);
      this.saveData();
      return true;
    }
    return false;
  }

  async getAllBusinesses(): Promise<Business[]> {
    return Array.from(this.businesses.values());
  }
}

export const storage = new FileStorage();
