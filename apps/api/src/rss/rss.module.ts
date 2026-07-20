import { Module } from "@nestjs/common";
import { PostsModule } from "../posts/posts.module";
import { RssController } from "./rss.controller";

@Module({ imports: [PostsModule], controllers: [RssController] })
export class RssModule {}
