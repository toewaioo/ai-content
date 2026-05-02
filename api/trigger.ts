import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadEnvConfig } from '../src/config/env';
import { GeminiService } from '../src/services/GeminiService';
import { SupabaseService } from '../src/services/SupabaseService';
import { TelegramService } from '../src/services/TelegramService';
import { AgentController } from '../src/controllers/AgentController';

/**
 * Vercel Serverless Function — entry point for the AI Content Agent.
 *
 * Security: Requires a `?token=` query parameter matching the CRON_SECRET
 * environment variable. This prevents unauthorized external triggers.
 *
 * Flow:
 *   1. Validate auth token
 *   2. Load config & instantiate services (DI at the composition root)
 *   3. Run the AgentController pipeline
 *   4. Return result
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // ─── Auth Guard ─────────────────────────────────────────────
  const token = req.query['token'];
  const cronSecret = process.env['CRON_SECRET'];

  if (!cronSecret || token !== cronSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // ─── Composition Root (Dependency Injection) ────────────────
    const config = loadEnvConfig();

    const dbService = new SupabaseService(config.supabaseUrl, config.supabaseKey);

    // Select a random API key to distribute the load across multiple free tier keys
    const randomKey = config.geminiApiKeys[Math.floor(Math.random() * config.geminiApiKeys.length)];
    const geminiService = new GeminiService(randomKey, dbService);
    const telegramService = new TelegramService(
      config.telegramBotToken,
      config.telegramChatId
    );
    const controller = new AgentController(geminiService, telegramService);

    // ─── Execute Pipeline ───────────────────────────────────────
    const result = await controller.run();

    res.status(200).json({
      success: true,
      topic: result.topic,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[trigger] Pipeline failed:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
}
