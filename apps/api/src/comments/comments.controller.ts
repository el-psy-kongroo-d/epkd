import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post } from "@nestjs/common";
import type { Comment } from "@epkd/shared";
import { CommentsService } from "./comments.service";

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get("api/posts/:slug/comments")
  list(@Param("slug") slug: string): Promise<Comment[]> {
    return this.commentsService.list(slug);
  }

  @Post("api/posts/:slug/comments")
  @HttpCode(201)
  create(@Param("slug") slug: string, @Body() raw: unknown): Promise<Comment> {
    return this.commentsService.create(slug, raw);
  }

  @Delete("api/comments/:id")
  @HttpCode(204)
  async remove(
    @Param("id") id: string,
    @Body() raw: unknown,
    @Headers("authorization") authHeader: string | undefined,
  ): Promise<void> {
    await this.commentsService.remove(id, raw, authHeader);
  }
}
