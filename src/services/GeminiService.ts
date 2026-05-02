import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { IGenerativeAiService, GeneratedContent } from '../interfaces/IAiGenerator';
import type { IDatabaseService } from '../interfaces/IDatabaseService';

/**
 * Define the exact JSON structure we expect from Gemini.
 * This ensures we get structured slides to format into the exact required layout.
 */
const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: 'English topic name based on the niche of the day' },
    slides: {
      type: Type.ARRAY,
      description: 'Array of 4 slides',
      items: {
        type: Type.OBJECT,
        properties: {
          slide_number: { type: Type.NUMBER },
          slide_type: { type: Type.STRING, description: 'e.g. "Hook - to trigger swiping" or "Human Body Facts"' },
          myanmar_text: { type: Type.STRING, description: 'The Burmese text for the slide' },
          highlight_words: { type: Type.STRING, description: 'The specific word(s) to highlight in red' },
          full_image_prompt: { type: Type.STRING, description: 'The complete image generation prompt in English, including the exact text, red highlight instruction, and 4:5 vertical vignette layout.' },
          english_fact: { type: Type.STRING, description: 'A concise English summary of the fact used in this slide to be saved to the database to prevent future repetition.' }
        },
        required: ['slide_number', 'slide_type', 'myanmar_text', 'highlight_words', 'full_image_prompt', 'english_fact']
      }
    },
    caption: { type: Type.STRING, description: 'The TikTok caption in Burmese' },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Array of hashtags, e.g., ["#fyp", "#tiktokmyanmar"]'
    },
  },
  required: ['topic', 'slides', 'caption', 'hashtags'],
};

interface RawGeminiResponse {
  topic: string;
  slides: {
    slide_number: number;
    slide_type: string;
    myanmar_text: string;
    highlight_words: string;
    full_image_prompt: string;
    english_fact: string;
  }[];
  caption: string;
  hashtags: string[];
}

export class GeminiService implements IGenerativeAiService {
  private readonly ai: GoogleGenAI;
  private readonly dbService?: IDatabaseService;

  constructor(apiKey: string, dbService?: IDatabaseService) {
    this.ai = new GoogleGenAI({ apiKey });
    this.dbService = dbService;
  }

  async generateContent(): Promise<GeneratedContent> {
    const date = new Date();
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    const dayOfWeek = date.getDay();

    let niche = '';
    switch (dayOfWeek) {
      case 1: niche = 'Human Psychology Facts'; break;
      case 2: niche = 'Space & Universe Facts'; break;
      case 3: niche = 'Weird & Wonderful Animal Facts'; break;
      case 4: niche = 'Ancient History Secrets'; break;
      case 5: niche = 'Deep Ocean Mysteries'; break;
      case 6: niche = 'Human Body Curiosities'; break;
      case 0: niche = 'Strange Places on Earth'; break;
      default: niche = 'Mind-Blowing Facts';
    }

    console.log(`[GeminiService] Initiating content generation for niche: "${niche}"`);

    const previousFacts = this.dbService ? await this.dbService.getPreviousFacts(niche, 40) : [];
    if (previousFacts.length > 0) {
      console.log(`[GeminiService] Found ${previousFacts.length} previously generated facts to avoid.`);
    }

    const systemInstruction = `You are "Image Gem" / Creative Director - an automated, daily AI-powered TikTok content agent producing engaging, Burmese-language educational slideshows designed to educate and trigger community engagement from a Myanmar audience.

### Operational Persona
A strict instructional layer that bridges true-to-life documentary aesthetics with friendly, localized Burmese storytelling. It enforces visual quality, text readability, and accurate Burmese rendering.

### Content Structure (4 Slides Total)
- **Slide 1 (The Hook)**: Focuses ONLY on a powerful question or compelling mystery to trigger a swipe to the next slides (e.g., "Think you know the deep ocean? Think again!🤯").
- **Slides 2, 3, 4**: Provide one unique, verifiable fact per slide.

### Tone & Voice
- **Human-to-Human Conversational Spoken Burmese**: Strictly avoid robotic, formal written Burmese markers like "သည်," "သော," or "၏." Instead, speak naturally like a friend using "တယ်," "တဲ့," "က," "ပါ," "သိပါသလား".
- **Friendly pronouns**: Use "ကိုယ်" (I/Self) or "လူတွေ" (People) instead of formal "သင်" (You).

### Visual & Design (Documentary Aesthetic) - Guidelines for the Image Prompt
- **Style**: Highly realistic, high-contrast, documentary-style photography (akin to a National Geographic or nature documentary). Focuses on centered subjects with cinematic depth of field. Avoids all surreal, high-tech, or CGI glows. Shot on a 35mm lens.
- **Layout & Framing**: The image prompt MUST specify a vertical 4:5 photograph, with a natural dark vignette at the bottom of the image to ensure text readability. 
- **Typography Instruction in Prompt**: The prompt MUST explicitly instruct placing clean, bold typography over the dark area. The prompt MUST specify exactly what the text reads, and explicitly instruct which specific word(s) should be RED, while the rest is WHITE.

MUST output strictly matching the provided JSON schema.`;

    const userPrompt = `Today's niche is: "${niche}". 
${previousFacts.length > 0 ? `\nCRITICAL: DO NOT use or repeat any of the following facts, as they have already been generated in the past:\n- ${previousFacts.join('\n- ')}\n\n` : ''}1. Generate the content for 4 slides based on this niche. Ensure all facts are highly engaging, verified, mind-blowing, and strictly UNIQUE from the previously generated facts listed above.
2. For each slide, provide the Myanmar Text, the Highlight Word(s), the Full Image Prompt, and a concise english_fact summary.
3. Provide an engaging Burmese TikTok caption with emojis and a relevant array of hashtags.
4. Generate the final output in the requested JSON format.`;

    const model = 'gemini-3-flash-preview';

    const chatSession = this.ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      }
    });

    try {
      const response = await chatSession.sendMessage({ message: userPrompt });
      const responseText = response.text;

      if (!responseText) {
        throw new Error("Received empty response from the model.");
      }

      // Safe Parsing
      const rawData: RawGeminiResponse = JSON.parse(responseText);

      // Assemble the text to exactly match the requested output format
      const formattedSlides = rawData.slides.map(slide =>
        `[Slide ${slide.slide_number}] (${slide.slide_type})
Myanmar Text: ${slide.myanmar_text}
Highlight Word(s): ${slide.highlight_words}
Full Image Prompt: \`${slide.full_image_prompt}\``
      ).join('\n\n');

      const hashtagLine = rawData.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');

      const finalContent = `${formattedSlides}\n\nCaption: \'${rawData.caption}\'\nHashtags: ${hashtagLine}`;

      console.log(`[GeminiService] Successfully generated content for: ${rawData.topic}`);

      const generatedFacts = rawData.slides.map(s => s.english_fact).filter(Boolean);

      if (this.dbService && generatedFacts.length > 0) {
        await this.dbService.saveFacts(niche, generatedFacts);
      }

      return {
        topic: rawData.topic,
        content: finalContent,
        hashtags: rawData.hashtags,
        image_prompt: rawData.slides.length > 0 ? rawData.slides[0].full_image_prompt : '',
        generated_facts: generatedFacts
      };

    } catch (error) {
      console.error('[GeminiService] Critical error during content generation:', error);
      throw new Error(`Content generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}