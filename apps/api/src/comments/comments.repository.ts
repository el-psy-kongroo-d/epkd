import { Injectable, Logger } from "@nestjs/common";
import { ErrorCode } from "@epkd/shared";
import { AppException } from "../common/app.exception";
import type { Database } from "../supabase/database.types";
import { SupabaseService } from "../supabase/supabase.service";

export type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
export type NewCommentRow = Omit<Database["public"]["Tables"]["comments"]["Insert"], "id" | "created_at">;

const INTERNAL_ERROR_MESSAGE = "internal error";

@Injectable()
export class CommentsRepository {
  private readonly logger = new Logger(CommentsRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  private fail(context: string, message: string): never {
    this.logger.error(`${context}: ${message}`);
    throw new AppException(ErrorCode.INTERNAL, 500, INTERNAL_ERROR_MESSAGE);
  }

  async listBySlug(slug: string): Promise<CommentRow[]> {
    const { data, error } = await this.supabase.client
      .from("comments")
      .select("*")
      .eq("post_slug", slug)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) this.fail("listBySlug", error.message);
    return data ?? [];
  }

  async insert(row: NewCommentRow): Promise<CommentRow> {
    const { data, error } = await this.supabase.client.from("comments").insert(row).select().single();
    if (error) this.fail("insert", error.message);
    return data;
  }

  async findById(id: number): Promise<CommentRow | null> {
    const { data, error } = await this.supabase.client.from("comments").select("*").eq("id", id).maybeSingle();
    if (error) this.fail("findById", error.message);
    return data ?? null;
  }

  async deleteById(id: number): Promise<void> {
    const { error } = await this.supabase.client.from("comments").delete().eq("id", id);
    if (error) this.fail("deleteById", error.message);
  }
}
