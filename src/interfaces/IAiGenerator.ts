/**
 * Structured output from the AI content generation.
 */
export interface GeneratedContent {
  /** The specific topic chosen based on search results */
  topic: string;
  /** The main text content of the post */
  content: string;
  /** Suggested hashtags for the post */
  hashtags: string[];
  image_prompt: string;
  /** English summary of facts used in the generation to prevent future repetition */
  generated_facts: string[];
}

/**
 * Contract for any AI-powered content generation service.
 * Implementations must research a random field and produce structured content.
 */
export interface IGenerativeAiService {
  /**
   * Generates content.
   * @returns Structured content ready for publishing
   */
  generateContent(): Promise<GeneratedContent>;
}
