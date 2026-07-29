import { Injectable, Logger } from "@nestjs/common";
import { ErrorCode, type SiteStats } from "@epkd/shared";
import { AppException } from "../common/app.exception";
import { SupabaseService } from "../supabase/supabase.service";

const INTERNAL_ERROR_MESSAGE = "internal error";

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private fail(context: string, message: string): never {
    this.logger.error(`${context}: ${message}`);
    throw new AppException(ErrorCode.INTERNAL, 500, INTERNAL_ERROR_MESSAGE);
  }

  async total(): Promise<SiteStats> {
    const { data, error } = await this.supabase.client.from("site_stats").select("total_visits").eq("id", 1).single();
    if (error) this.fail("total", error.message);
    return { totalVisits: Number((data as { total_visits?: unknown } | null)?.total_visits) || 0 };
  }

  async recordVisit(): Promise<SiteStats> {
    const { data, error } = await this.supabase.client.rpc("increment_site_visits");
    if (error) this.fail("recordVisit", error.message);
    return { totalVisits: Number(data) || 0 };
  }
}
