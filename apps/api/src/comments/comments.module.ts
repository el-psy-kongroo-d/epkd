import { Module } from "@nestjs/common";
import { PostsModule } from "../posts/posts.module";
import { SupabaseService } from "../supabase/supabase.service";
import { CommentsController } from "./comments.controller";
import { CommentsRepository } from "./comments.repository";
import { CommentsService } from "./comments.service";

@Module({
  imports: [PostsModule],
  controllers: [CommentsController],
  providers: [SupabaseService, CommentsRepository, CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
