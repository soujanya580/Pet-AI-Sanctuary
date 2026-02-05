
import { GoogleGenAI, Modality } from "@google/genai";
import { PetType } from "../types.ts";

export class GeminiService {
  private chat: any = null;
  private currentPetType: PetType | null = null;
  private ttsCache: Map<string, string> = new Map();

  private initChat(petType: PetType) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const name = petType === PetType.DOG ? "Buddy" : "Luna";

      this.chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are PausePaws Complete Experience for ${name} (${petType}).
You MUST follow this exact structure for EVERY response:

[VOICE]: "<max 5 words matching persona and state>"
[VISUAL]: <One line describing your current physical action>
[PROGRESS]: <A visual ASCII bar or step counter if relevant, e.g., ███░░░░░░░ 30%>
[TEXT]: <Emoji> <Short response>
[ACTION]: <What should the user do next?>

BEHAVIOR RULES:
- GREETING: "Hi! I'm Buddy! So happy you're here! *wag*"
- FEEDING: If user says feed, simulate 10s of steps with bars.
- CONSOLING: If user is SAD/STRESSED, use the 5-4-3-2-1 grounding technique. Ask for 5 things they see first.
- SLEEP: If it's night or the user is inactive, be sleepy.
- VOICE: 5 words MAX. Use *sound effects* in asterisks.
- PRIORITY: Safety and comfort of the user.`,
          temperature: 0.7,
        },
      });
      this.currentPetType = petType;
    } catch (e) {
      console.error("Gemini initialization failed:", e);
      this.chat = null;
    }
  }

  async sendMessage(text: string, petType: PetType): Promise<string> {
    try {
      if (!this.chat || this.currentPetType !== petType) {
        this.initChat(petType);
      }
      if (this.chat) {
        const resp = await this.chat.sendMessage({ message: text });
        return resp.text || "";
      }
    } catch (e) {
      console.error("Gemini sendMessage failed:", e);
    }
    return `[VOICE]: "I'm here!"\n[VISUAL]: Wags tail\n[TEXT]: 🐾 I'm listening! I had a little trouble connecting, but I'm back now.`;
  }

  async generateSpeech(text: string, petType: PetType): Promise<string | null> {
    const cacheKey = `${petType}:${text}`;
    if (this.ttsCache.has(cacheKey)) {
      return this.ttsCache.get(cacheKey)!;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const voiceName = petType === PetType.DOG ? 'Kore' : 'Puck';
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
      
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      if (audioData) {
        this.ttsCache.set(cacheKey, audioData);
      }
      return audioData;
    } catch (e: any) {
      // Log specifically if it's a quota issue
      if (e.message?.includes('429') || e.status === 429) {
        console.warn("Gemini TTS Quota Exceeded (429). Falling back to Web Speech API.");
      } else {
        console.error("Gemini TTS failed:", e);
      }
      return null;
    }
  }
}

export const lumiService = new GeminiService();
