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
  employeeId: text("employee_id"), // The ID of the user who is currently online for this business
});

export const insertServerConfigSchema = createInsertSchema(serverConfigs);
export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, isOnline: true, employeeId: true });

export type ServerConfig = typeof serverConfigs.$inferSelect;
export type InsertServerConfig = z.infer<typeof insertServerConfigSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
