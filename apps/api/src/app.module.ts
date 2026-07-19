import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { createRateLimiter } from "./common/rate-limit";
import { PUBLISH_RATE_LIMIT } from "./config";
import { PostsModule } from "./posts/posts.module";

@Module({ imports: [PostsModule] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(createRateLimiter({ ...PUBLISH_RATE_LIMIT, message: "too many publish requests" }))
      .forRoutes({ path: "api/posts", method: RequestMethod.POST });
    consumer
      .apply(createRateLimiter({ ...PUBLISH_RATE_LIMIT, message: "too many publish requests" }))
      .forRoutes({ path: "api/posts/:slug", method: RequestMethod.DELETE });
  }
}
