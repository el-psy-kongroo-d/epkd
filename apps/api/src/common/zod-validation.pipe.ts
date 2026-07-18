import { Injectable, PipeTransform } from "@nestjs/common";
import { ErrorCode } from "@epkd/shared";
import type { ZodSchema } from "zod";
import { AppException } from "./app.exception";

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const detail = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new AppException(ErrorCode.VALIDATION_FAILED, 400, detail);
    }
    return result.data;
  }
}
