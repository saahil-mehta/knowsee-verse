import { z } from "zod";

export const createPlaybookSectionSchema = z.object({
  title: z.string().min(1).max(256),
});

export const updatePlaybookSectionSchema = z
  .object({
    title: z.string().min(1).max(256).optional(),
    body: z.string().max(50_000).optional(),
  })
  .refine((v) => v.title !== undefined || v.body !== undefined, {
    message: "title or body must be provided",
  });
