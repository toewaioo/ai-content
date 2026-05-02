export interface IDatabaseService {
  /**
   * Fetches previously generated facts for a specific niche to avoid repetition.
   */
  getPreviousFacts(niche: string, limit?: number): Promise<string[]>;
  
  /**
   * Saves newly generated facts to the database.
   */
  saveFacts(niche: string, facts: string[]): Promise<void>;
}
