import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { ErrorCode, PublishPostSchema, type PostDetail, type PostMeta, type PublishPost } from "@epkd/shared";
import { AppException } from "../common/app.exception";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PublishGuard } from "./publish.guard";
import { PostsService } from "./posts.service";

const CACHE_CONTROL = "public, max-age=60";
const publishPipe = new ZodValidationPipe(PublishPostSchema);

function isDraft(raw: unknown): boolean {
  return typeof raw === "object" && raw !== null && (raw as Record<string, unknown>).draft === true;
}

@Controller("api/posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @Header("Cache-Control", CACHE_CONTROL)
  list(): Promise<PostMeta[]> {
    return this.postsService.list();
  }

  @Get(":slug")
  @Header("Cache-Control", CACHE_CONTROL)
  get(@Param("slug") slug: string): Promise<PostDetail> {
    return this.postsService.get(slug);
  }

  @Post()
  @UseGuards(PublishGuard)
  publish(@Body() raw: unknown): Promise<PostMeta> {
    if (isDraft(raw)) throw new AppException(ErrorCode.VALIDATION_FAILED, 400, "draft posts must not be published");
    const dto: PublishPost = publishPipe.transform(raw);
    return this.postsService.publish(dto);
  }

  @Delete(":slug")
  @UseGuards(PublishGuard)
  @HttpCode(204)
  async remove(@Param("slug") slug: string): Promise<void> {
    await this.postsService.delete(slug);
  }

  @Post(":slug/view")
  @HttpCode(204)
  async view(@Param("slug") slug: string): Promise<void> {
    await this.postsService.recordView(slug);
  }
}
