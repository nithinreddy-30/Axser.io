
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Garment, StylingSuggestion, AccessRequest, Notification, User } from "../types.ts";

const SUPABASE_URL = "https://dxzmmckoaavtsrrymegb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4em1tY2tvYWF2dHNycnltZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjAxMzcsImV4cCI6MjA4NDczNjEzN30.OkRWRnOtUyMH51rSYLRpYvMvQrzM8wlyOLJ8KkBKMew";

export class DBService {
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async init(): Promise<void> {
    // Supabase session is handled via auth listener in App.tsx
    return Promise.resolve();
  }

  async getAllItems<T>(tableName: string): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*');
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.error(`[DB Error] Table "${tableName}" does not exist in the database. Please run the SQL schema setup.`);
        } else {
          console.error(`[DB Error] Fetching from ${tableName}:`, error.message);
        }
        return [];
      }
      return (data || []) as unknown as T[];
    } catch (err) {
      console.error(`[Unexpected Error] Failed to fetch ${tableName}:`, err);
      return [];
    }
  }

  async saveItem<T>(tableName: string, item: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .upsert(item);
      
      if (error) {
        if (error.code === 'PGRST205') {
          const msg = `Table "${tableName}" missing. Cannot save data. Run SQL schema in Supabase.`;
          console.error(`[DB Error] ${msg}`);
          throw new Error(msg);
        }
        console.error(`[DB Error] Saving to ${tableName}:`, error.message);
        throw error;
      }
    } catch (err: any) {
      console.error(`[Unexpected Error] Failed to save to ${tableName}:`, err.message);
      throw err;
    }
  }

  async deleteItem(tableName: string, id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`[DB Error] Deleting from ${tableName}:`, error.message);
        throw error;
      }
    } catch (err) {
      console.error(`[Unexpected Error] Delete failed:`, err);
      throw err;
    }
  }

  async clearStore(tableName: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .neq('id', 'placeholder_prevent_empty_delete');
        
      if (error) {
        console.error(`[DB Error] Clearing ${tableName}:`, error.message);
        throw error;
      }
    } catch (err) {
      console.error(`[Unexpected Error] Clear failed:`, err);
      throw err;
    }
  }

  async getProfile(userId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // Handle case where profile doesn't exist yet for new user (PGRST116)
        // Also suppress AbortError warnings as they are common when signals are canceled due to unmounts
        const isAbortError = error.name === 'AbortError' || error.message?.includes('aborted');
        if (error.code !== 'PGRST116' && !isAbortError) {
           console.warn(`[Profile Notice] ${error.message}`);
        }
        return null;
      }
      return data;
    } catch (err) {
      return null;
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    try {
      await this.supabase
        .from('notifications')
        .update({ isRead: true })
        .eq('id', id);
    } catch (err) {
      console.error("[Notif Error] Could not update status:", err);
    }
  }
}

export const dbService = new DBService();
