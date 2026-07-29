import { Module } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
  controllers: [StatsController],
  providers: [SupabaseService, StatsService],
})
export class StatsModule {}
