import { Injectable } from "@nestjs/common";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private _client: SupabaseClient | null = null;

  get client(): SupabaseClient {
    if (!this._client) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
      }
      this._client = createClient(url, key, { auth: { persistSession: false } });
    }
    return this._client;
  }
}
