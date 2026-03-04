import fs from "fs";
import path from "path";
import {
  serverConfigs,
  businesses,
  properties,
  type ServerConfig,
  type InsertServerConfig,
  type Business,
  type InsertBusiness,
  type Property,
  type InsertProperty
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

  // Properties
  getProperties(guildId: string): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, updates: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: number): Promise<boolean>;
}

export class FileStorage implements IStorage {
  private configPath = path.resolve("data", "configs.json");
  private businessPath = path.resolve("data", "businesses.json");
  private propertyPath = path.resolve("data", "properties.json");
  private configs: Map<string, ServerConfig>;
  private businesses: Map<number, Business>;
  private properties: Map<number, Property>;
  private currentBusinessId: number;
  private currentPropertyId: number;

  constructor() {
    if (!fs.existsSync("data")) {
      fs.mkdirSync("data");
    }

    this.configs = new Map();
    this.businesses = new Map();
    this.properties = new Map();
    this.currentBusinessId = 1;
    this.currentPropertyId = 1;

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
    if (fs.existsSync(this.propertyPath)) {
      try {
        const stats = fs.statSync(this.propertyPath);
        if (stats.size > 0) {
          const raw = fs.readFileSync(this.propertyPath, "utf-8").trim();
          if (raw) {
            const data = JSON.parse(raw);
            data.forEach((p: Property) => {
              this.properties.set(p.id, p);
              if (p.id >= this.currentPropertyId) this.currentPropertyId = p.id + 1;
            });
          }
        }
      } catch (e) {
        console.warn("Could not parse properties.json, starting fresh.", e);
      }
    }
  }

  private saveData() {
    fs.writeFileSync(this.configPath, JSON.stringify(Object.fromEntries(this.configs)));
    fs.writeFileSync(this.businessPath, JSON.stringify(Array.from(this.businesses.values())));
    fs.writeFileSync(this.propertyPath, JSON.stringify(Array.from(this.properties.values())));
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

  // Properties
  async getProperties(guildId: string): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(p => p.guildId === guildId);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const id = this.currentPropertyId++;
    const newProperty: Property = { ...property, id };
    this.properties.set(id, newProperty);
    this.saveData();
    return newProperty;
  }

  async updateProperty(id: number, updates: Partial<InsertProperty>): Promise<Property> {
    const property = this.properties.get(id);
    if (!property) throw new Error("Property not found");
    const updated = { ...property, ...updates };
    this.properties.set(id, updated);
    this.saveData();
    return updated;
  }

  async deleteProperty(id: number): Promise<boolean> {
    const deleted = this.properties.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }
}

export const storage = new FileStorage();
