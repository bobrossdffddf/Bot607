import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const serverConfigs = pgTable("server_configs", {
  guildId: text("guild_id").primaryKey(),
  propertiesChannelId: text("properties_channel_id").notNull(),
  businessesChannelId: text("businesses_channel_id").notNull(),
  businessesMessageId: text("businesses_message_id"), // The ID of the embed message we keep updating
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  roleId: text("role_id").notNull(),
  name: text("name").notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  employeeIds: text("employee_ids").array(), // Changed from employeeId to array of strings
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  owner: text("owner"), // Optional, null if unowned
  permit: text("permit").notNull(),
  cost: text("cost").notNull(),
  intendedUse: text("intended_use").notNull(),
  criminalActivity: boolean("criminal_activity").notNull(),
  boughtOn: text("bought_on").notNull(),
  thumbnail: text("thumbnail").notNull(),
  mediaGallery: text("media_gallery").array(),
});

export const insertServerConfigSchema = createInsertSchema(serverConfigs);
export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, isOnline: true, employeeId: true });
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });

export type ServerConfig = typeof serverConfigs.$inferSelect;
export type InsertServerConfig = z.infer<typeof insertServerConfigSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
