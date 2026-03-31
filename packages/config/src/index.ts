import { z } from "zod";

const sharedEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  QUEUE_DRIVER: z.enum(["redis"]).default("redis"),
  QUEUE_URL: z.string().url().default("redis://localhost:6379"),
  REDIS_URL: z.string().url().default("redis://localhost:6379")
});

const serverOnlyEnvSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_BASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  MICROSOFT_TENANT_ID: z.string().min(1),
  MICROSOFT_CLIENT_ID: z.string().min(1),
  MICROSOFT_CLIENT_SECRET: z.string().min(1),
  MICROSOFT_WEBHOOK_BASE_URL: z.string().url(),
  VITE_API_BASE_URL: z.string().url()
});

const serverEnvSchema = sharedEnvSchema.extend(serverOnlyEnvSchema.shape);
const queueEnvSchema = sharedEnvSchema.pick({
  NODE_ENV: true,
  LOG_LEVEL: true,
  QUEUE_DRIVER: true,
  QUEUE_URL: true,
  REDIS_URL: true
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type QueueEnv = z.infer<typeof queueEnvSchema>;

export function getServerEnv(input: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse(input);
}

export function getQueueEnv(input: NodeJS.ProcessEnv = process.env): QueueEnv {
  return queueEnvSchema.parse(input);
}

export { queueEnvSchema, serverEnvSchema };
