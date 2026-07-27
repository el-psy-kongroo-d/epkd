import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { CommentsModule } from "./comments/comments.module";
import { createRateLimiter } from "./common/rate-limit";
import { COMMENT_RATE_LIMIT, PUBLISH_RATE_LIMIT } from "./config";
import { OssModule } from "./oss/oss.module";
import { PagesModule } from "./pages/pages.module";
import { PostsModule } from "./posts/posts.module";
import { RssModule } from "./rss/rss.module";

@Module({ imports: [PostsModule, RssModule, CommentsModule, OssModule, PagesModule] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(createRateLimiter({ ...PUBLISH_RATE_LIMIT, message: "too many publish requests" }))
      .forRoutes({ path: "api/posts", method: RequestMethod.POST });
    consumer
      .apply(createRateLimiter({ ...PUBLISH_RATE_LIMIT, message: "too many publish requests" }))
      .forRoutes({ path: "api/posts/:slug", method: RequestMethod.DELETE });
    consumer
      .apply(createRateLimiter({ ...COMMENT_RATE_LIMIT, message: "too many comments" }))
      .forRoutes({ path: "api/posts/:slug/comments", method: RequestMethod.POST });
  }
}
