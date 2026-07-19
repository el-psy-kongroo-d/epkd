import { Module } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { MarkdownRenderer } from "./markdown.renderer";
import { PostsController } from "./posts.controller";
import { PostsRepository } from "./posts.repository";
import { PostsService } from "./posts.service";
import { SupabasePostsRepository } from "./supabase-posts.repository";

@Module({
  controllers: [PostsController],
  providers: [
    SupabaseService,
    { provide: PostsRepository, useClass: SupabasePostsRepository },
    { provide: MarkdownRenderer, useValue: new MarkdownRenderer() },
    PostsService,
  ],
  exports: [PostsService],
})
export class PostsModule {}
