import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

// Utility to parse and log Zod errors nicely
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod Error] ${label} validation failed:`, result.error.format());
    // Still return data to not hard-crash the UI if it's a minor type mismatch,
    // but in a strict app you might throw here. Throwing to be safe per requirements.
    throw new Error(`Data validation failed for ${label}`);
  }
  return result.data;
}

export function useBotStatus() {
  return useQuery({
    queryKey: [api.botStatus.get.path],
    queryFn: async () => {
      const res = await fetch(api.botStatus.get.path);
      if (!res.ok) throw new Error("Failed to fetch bot status");
      const data = await res.json();
      return parseWithLogging(api.botStatus.get.responses[200], data, "Bot Status");
    },
    refetchInterval: 5000, // Poll every 5 seconds as requested
  });
}

export function useServers() {
  return useQuery({
    queryKey: [api.servers.list.path],
    queryFn: async () => {
      const res = await fetch(api.servers.list.path);
      if (!res.ok) throw new Error("Failed to fetch servers");
      const data = await res.json();
      return parseWithLogging(api.servers.list.responses[200], data, "Servers List");
    },
  });
}

export function useBusinesses() {
  return useQuery({
    queryKey: [api.businesses.list.path],
    queryFn: async () => {
      const res = await fetch(api.businesses.list.path);
      if (!res.ok) throw new Error("Failed to fetch businesses");
      const data = await res.json();
      return parseWithLogging(api.businesses.list.responses[200], data, "Businesses List");
    },
  });
}
