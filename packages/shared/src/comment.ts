import { z } from "zod";
import { SLUG_REGEX } from "./post";

export const CommentSchema = z.object({
  id: z.number().int().positive(),
  postSlug: z.string().regex(SLUG_REGEX),
  nickname: z.string().min(1).max(24),
  body: z.string().min(1).max(1000),
  createdAt: z.string(),
});
export type Comment = z.infer<typeof CommentSchema>;

export const CreateCommentSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  password: z.string().min(4).max(72),
  body: z.string().trim().min(1).max(1000),
  website: z.string().max(0).optional().or(z.literal("")),
});
export type CreateComment = z.infer<typeof CreateCommentSchema>;

export const DeleteCommentSchema = z.object({ password: z.string().min(4).max(72) });
export type DeleteComment = z.infer<typeof DeleteCommentSchema>;
