import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ErrorCode } from "@epkd/shared";
import type { Request } from "express";
import { AppException } from "../common/app.exception";
import { isValidBearerToken } from "../common/bearer-token";

@Injectable()
export class PublishGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const header = context.switchToHttp().getRequest<Request>().headers.authorization;
    if (!isValidBearerToken(header, process.env.PUBLISH_TOKEN)) {
      throw new AppException(ErrorCode.UNAUTHORIZED, 401, "invalid publish token");
    }
    return true;
  }
}
