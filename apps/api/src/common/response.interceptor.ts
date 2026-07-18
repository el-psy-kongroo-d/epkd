import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ok } from "@epkd/shared";
import type { Request } from "express";
import { Observable, map } from "rxjs";

const API_PREFIX = "/api";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.path.startsWith(API_PREFIX)) return next.handle();
    return next.handle().pipe(map((data) => ok(data)));
  }
}
