/**
 * Centralized, validated environment configuration.
 * Fails fast at startup if any required variable is missing.
 */
export interface EnvConfig {
  geminiApiKeys: string[];
  telegramBotToken: string;
  telegramChatId: string;
  cronSecret: string;
  supabaseUrl: string;
  supabaseKey: string;
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] || process.env[fallback || ''];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadEnvConfig(): EnvConfig {
  const keysString = requireEnv('GEMINI_API_KEYS', 'GEMINI_API_KEY');
  const geminiApiKeys = keysString.split(',').map(key => key.trim()).filter(Boolean);

  if (geminiApiKeys.length === 0) {
    throw new Error('GEMINI_API_KEYS contains no valid keys');
  }

  return {
    geminiApiKeys,
    telegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    telegramChatId: requireEnv('TELEGRAM_CHAT_ID'),
    cronSecret: requireEnv('CRON_SECRET'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseKey: requireEnv('SUPABASE_KEY'),
  };
}
