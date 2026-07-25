import { Controller, Get, Header } from "@nestjs/common";
import type { OssRepo } from "@epkd/shared";
import { OssService } from "./oss.service";

@Controller()
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @Get("api/oss")
  @Header("Cache-Control", "public, max-age=3600")
  async getOss(): Promise<{ repos: OssRepo[] }> {
    const repos = await this.ossService.getRepos();
    return { repos };
  }
}
