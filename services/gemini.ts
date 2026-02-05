
import { GoogleGenAI, Chat } from "@google/genai";
import { PetType } from "../types.ts";

export class GeminiService {
  private chat: Chat | null = null;
  private currentPetType: PetType | null = null;

  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private initChat(petType: PetType) {
    try {
      const ai = this.getAI();
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
      this.chat = null;
    }
  }

  async sendMessage(text: string, petType: PetType): Promise<string> {
    try {
      if (!this.chat || this.currentPetType !== petType) this.initChat(petType);
      if (this.chat) {
        const resp = await this.chat.sendMessage({ message: text });
        return resp.text || "";
      }
    } catch (e) {}
    return `[VOICE]: "I'm here!"\n[VISUAL]: Wags tail\n[TEXT]: 🐾 I'm listening!`;
  }

  async generateSpeech(text: string, petType: PetType): Promise<string | null> {
    try {
      const ai = this.getAI();
      const voiceName = petType === PetType.DOG ? 'Kore' : 'Puck';
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) { return null; }
  }
}

export const lumiService = new GeminiService();
