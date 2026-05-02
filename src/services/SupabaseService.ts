import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IDatabaseService } from '../interfaces/IDatabaseService';

export class SupabaseService implements IDatabaseService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key are required');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getPreviousFacts(niche: string, limit: number = 50): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('generated_facts')
      .select('fact')
      .eq('niche', niche)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[SupabaseService] Error fetching previous facts:', error);
      return [];
    }

    return data.map(row => row.fact);
  }

  async saveFacts(niche: string, facts: string[]): Promise<void> {
    if (facts.length === 0) return;

    const rows = facts.map(fact => ({
      niche,
      fact,
    }));

    const { error } = await this.supabase
      .from('generated_facts')
      .insert(rows);

    if (error) {
      console.error('[SupabaseService] Error saving facts:', error);
      throw new Error(`Failed to save facts to Supabase: ${error.message}`);
    }
    
    console.log(`[SupabaseService] Successfully saved ${facts.length} facts for niche "${niche}".`);
  }
}
