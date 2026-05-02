import type { IGenerativeAiService } from '../interfaces/IAiGenerator';
import type { INotifierService } from '../interfaces/INotifier';

/**
 * Orchestrates the content generation pipeline.
 * Receives injected services — knows nothing about Gemini or Telegram specifics.
 */
export class AgentController {
  private readonly aiService: IGenerativeAiService;
  private readonly notifier: INotifierService;

  constructor(aiService: IGenerativeAiService, notifier: INotifierService) {
    this.aiService = aiService;
    this.notifier = notifier;
  }

  /**
   * Runs the full pipeline:
   * 1. Generate AI content (random field + web search + synthesis)
   * 2. Format for Telegram
   * 3. Send notification
   */
  async run(): Promise<{ success: boolean; topic: string }> {
    console.log('[AgentController] Starting content generation pipeline...');

    // Step 1: Generate content
    const generated = await this.aiService.generateContent();
    console.log(`[AgentController] Generated content on topic: "${generated.topic}"`);

    // Step 2: Format the Telegram message
    const message = this.formatMessage(generated.topic, generated.content, generated.hashtags, generated.image_prompt);

    // Step 3: Send via notifier
    await this.notifier.sendMessage(message);
    console.log('[AgentController] Message sent successfully.');

    return { success: true, topic: generated.topic };
  }

  /**
   * Formats the generated content into a Telegram-ready Markdown message.
   */
  private formatMessage(topic: string, content: string, hashtags: string[], image_prompt: string): string {
    // The GeminiService now formats the content exactly as required.
    // Return it without any additional wrapping.
    return content;
  }
}
