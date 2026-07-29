import { Controller, Get, Header, HttpCode, Post } from "@nestjs/common";
import type { SiteStats } from "@epkd/shared";
import { StatsService } from "./stats.service";

@Controller("api")
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get("stats")
  @Header("Cache-Control", "public, max-age=60")
  total(): Promise<SiteStats> {
    return this.stats.total();
  }

  @Post("visit")
  @HttpCode(200)
  visit(): Promise<SiteStats> {
    return this.stats.recordVisit();
  }
}
