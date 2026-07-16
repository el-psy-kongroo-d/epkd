import { z } from "zod";

export const OssRepoSchema = z.object({
  fullName: z.string(),
  url: z.string(),
  prCount: z.number().int().positive(),
});
export type OssRepo = z.infer<typeof OssRepoSchema>;
