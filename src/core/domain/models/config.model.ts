import { z } from 'zod';

export const DatabaseConfigSchema = z.object({
  host: z.string(),
  user: z.string(),
  password: z.string(),
  database: z.string(),
  port: z.number().optional().default(3306)
});

export const AppConfigSchema = z.object({
  db: DatabaseConfigSchema,
  queryDirs: z.array(z.string()),
  outputDir: z.string(),
  templateDir: z.string().optional(),
  customTypes: z.record(z.string(), z.string()).optional()
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;