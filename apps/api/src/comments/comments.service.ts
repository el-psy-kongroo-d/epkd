import { Inject, Injectable } from "@nestjs/common";
import { type Comment, CreateCommentSchema, DeleteCommentSchema, ErrorCode } from "@epkd/shared";
import bcrypt from "bcryptjs";
import type { ZodError } from "zod";
import { AppException } from "../common/app.exception";
import { isValidBearerToken } from "../common/bearer-token";
import { BCRYPT_COST, HONEYPOT_DELAY_MS } from "../config";
import { PostsService } from "../posts/posts.service";
import { CommentsRepository, type CommentRow } from "./comments.repository";

function toComment(row: CommentRow): Comment {
  return { id: row.id, postSlug: row.post_slug, nickname: row.nickname, body: row.body, createdAt: row.created_at };
}

function formatIssues(error: ZodError): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

function asRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

function isHoneypotFilled(raw: unknown): boolean {
  const website = asRecord(raw).website;
  return typeof website === "string" && website.length > 0;
}

function fakeComment(slug: string, raw: unknown): Comment {
  const obj = asRecord(raw);
  const nickname = typeof obj.nickname === "string" ? obj.nickname : "";
  const body = typeof obj.body === "string" ? obj.body : "";
  return { id: 0, postSlug: slug, nickname, body, createdAt: new Date().toISOString() };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function honeypotDelay(): Promise<void> {
  const { min, max } = HONEYPOT_DELAY_MS;
  return wait(min + Math.floor(Math.random() * (max - min + 1)));
}

@Injectable()
export class CommentsService {
  constructor(
    @Inject(CommentsRepository) private readonly repository: CommentsRepository,
    @Inject(PostsService) private readonly postsService: PostsService,
  ) {}

  async list(slug: string): Promise<Comment[]> {
    const rows = await this.repository.listBySlug(slug);
    return rows.map(toComment);
  }

  async create(slug: string, raw: unknown): Promise<Comment> {
    if (isHoneypotFilled(raw)) {
      await honeypotDelay();
      return fakeComment(slug, raw);
    }

    const parsed = CreateCommentSchema.safeParse(raw);
    if (!parsed.success) throw new AppException(ErrorCode.VALIDATION_FAILED, 400, formatIssues(parsed.error));

    await this.postsService.get(slug);

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
    const row = await this.repository.insert({
      post_slug: slug,
      nickname: parsed.data.nickname,
      password_hash: passwordHash,
      body: parsed.data.body,
    });
    return toComment(row);
  }

  async remove(idParam: string, raw: unknown, authHeader: string | undefined): Promise<void> {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppException(ErrorCode.COMMENT_NOT_FOUND, 404, `comment not found: ${idParam}`);
    }
    const row = await this.repository.findById(id);
    if (!row) throw new AppException(ErrorCode.COMMENT_NOT_FOUND, 404, `comment not found: ${id}`);

    if (isValidBearerToken(authHeader, process.env.PUBLISH_TOKEN)) {
      await this.repository.deleteById(id);
      return;
    }

    const parsed = DeleteCommentSchema.safeParse(raw);
    if (!parsed.success) throw new AppException(ErrorCode.VALIDATION_FAILED, 400, formatIssues(parsed.error));

    const matches = await bcrypt.compare(parsed.data.password, row.password_hash);
    if (!matches) throw new AppException(ErrorCode.FORBIDDEN, 403, "password mismatch");

    await this.repository.deleteById(id);
  }
}
