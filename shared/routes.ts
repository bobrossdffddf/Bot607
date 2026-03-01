import { z } from 'zod';
import { serverConfigs, businesses } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  botStatus: {
    get: {
      method: 'GET' as const,
      path: '/api/bot-status' as const,
      responses: {
        200: z.object({
          online: z.boolean(),
          guildsCount: z.number(),
          ping: z.number().nullable().optional(),
        }),
      },
    },
  },
  servers: {
    list: {
      method: 'GET' as const,
      path: '/api/servers' as const,
      responses: {
        200: z.array(z.custom<typeof serverConfigs.$inferSelect>()),
      },
    },
  },
  businesses: {
    list: {
      method: 'GET' as const,
      path: '/api/businesses' as const,
      responses: {
        200: z.array(z.custom<typeof businesses.$inferSelect>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
