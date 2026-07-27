import { Module } from "@nestjs/common";
import { PostsModule } from "../posts/posts.module";
import { PagesController } from "./pages.controller";
import { PagesService } from "./pages.service";

@Module({ imports: [PostsModule], controllers: [PagesController], providers: [PagesService] })
export class PagesModule {}
