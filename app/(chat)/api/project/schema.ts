import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(256),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(256),
});

export const brandProfileSchema = z.object({
  brandName: z.string().min(1).max(256),
  websiteUrl: z.string().url().max(512),
  logoUrl: z.string().url().max(512).optional(),
  country: z.string().min(1).max(64),
  market: z.string().max(64).optional(),
  categories: z.array(z.string().max(100)).max(20),
  competitors: z.array(z.string().max(100)).max(20),
  retailers: z.array(z.string().max(100)).max(20),
});
