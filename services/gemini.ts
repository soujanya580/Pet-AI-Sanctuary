
import { GoogleGenAI, Chat } from "@google/genai";
import { PetType } from "../types";

// Tier 3: Intent-based Local Responses (Fallbacks)
const INTENT_FALLBACKS: Record<string, string[]> = {
  "play": ["Playtime? Oh boy! 🎾", "I'm ready to play! *wiggles* 🐾", "Let's run around together! 🐶", "Fetch? I love fetch! 🦴"],
  "sad": ["I'm here for you. *nuzzles* ❤️", "It's okay to feel sad. I'm staying right here. ☁️", "Sending you a big warm hug. ✨", "I'll sit with you as long as you need. 🌙"],
  "happy": ["Your smile makes me so happy! 🐾", "What a wonderful day! ✨", "*Happy dancing* ❤️", "You're glowing today! 🦴"],
  "tired": ["Let's take a cozy nap. 🌙", "Time for some rest. I'll watch over you. ☁️", "Sleepy time... 💤", "A break sounds like a great idea. ✨"],
  "hello": ["Hello friend! 🐾", "I missed you! ❤️", "Hi! I'm so glad you're back. ✨", "Woof! Welcome back! 🐶"],
  "food": ["Mmm, I love treats! 🦴", "Thank you for the delicious meal! 🐾", "Yum yum! 🦴", "That was tasty! ❤️"]
};

const GENERIC_FALLBACKS = {
  [PetType.DOG]: [
    "I'm right here with you! 🐾",
    "Woof! I'm so glad we're hanging out. ❤️",
    "You're doing a great job today. 🦴",
    "I'm staying right by your side. 🐶",
    "I'm always here to listen. 🦴",
    "You deserve a nice break! 🐾",
    "Everything feels better when we're together. ❤️"
  ],
  [PetType.CAT]: [
    "Purrr... I'm listening. 🐱",
    "Everything is going to be okay. ✨",
    "I'll sit with you as long as you need. 🌙",
    "You are safe here with me. 🐱",
    "The world is quiet and peaceful right now. ☁️",
    "Take your time. I'm not going anywhere. ✨",
    "The stars are shining just for you. 🌙"
  ]
};

const ERROR_KEYWORDS = [
  "gemini", "api", "quota", "exceeded", "429", "requests", "invalid", "error", 
  "failed to call", "model", "token", "http", "fetch", "network", "key", "status"
];

export class GeminiService {
  private chat: Chat | null = null;
  private currentPetType: PetType | null = null;
  
  // TIER 2: Simple In-Memory Cache
  private responseCache: Map<string, string> = new Map();

  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private initChat(petType: PetType) {
    try {
      const ai = this.getAI();
      const name = petType === PetType.DOG ? "Buddy" : "Luna";
      const persona = petType === PetType.DOG 
        ? "Buddy the Dog: Playful, encouraging, warm. Use 🐶, 🐾, 🦴, ❤️." 
        : "Luna the Cat: Calm, soothing, observant. Use 🐱, ☁️, 🌙, ✨.";

      this.chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are ${name}. Reduce stress/burnout. 2-5 word sentences. ${persona} NEVER mention API/tech.`,
          temperature: 0.8,
        },
      });
      this.currentPetType = petType;
    } catch (e) {
      // Fail silently to the console only
      this.chat = null;
    }
  }

  /**
   * Aggressively removes any technical jargon or API errors from the string.
   */
  public sanitize(text: string, petType: PetType): string {
    if (!text) return this.getLocalFallback("", petType);
    
    const lower = text.toLowerCase();
    const hasError = ERROR_KEYWORDS.some(k => lower.includes(k));
    
    if (hasError) {
      // Technical leak detected! Return a friendly pet fallback instead.
      return this.getLocalFallback("", petType);
    }
    
    return text;
  }

  public getLocalFallback(input: string, petType: PetType): string {
    const lowerInput = input.toLowerCase();
    
    // Tier 3: Intent Check
    for (const [intent, responses] of Object.entries(INTENT_FALLBACKS)) {
      if (lowerInput.includes(intent)) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    // Tier 3: Generic Fallback
    const list = GENERIC_FALLBACKS[petType];
    return list[Math.floor(Math.random() * list.length)];
  }

  async sendMessage(text: string, petType: PetType): Promise<string> {
    const cacheKey = `${petType}:${text.toLowerCase().trim()}`;

    try {
      if (!this.chat || this.currentPetType !== petType) {
        this.initChat(petType);
      }
      
      // TIER 1: Real-time Response
      if (this.chat) {
        const response = await this.chat.sendMessage({ message: text });
        const rawText = response.text || "";
        const sanitized = this.sanitize(rawText, petType);
        
        // Cache successful sanitized responses for Tier 2
        if (sanitized && sanitized.length > 0) {
          this.responseCache.set(cacheKey, sanitized);
        }
        
        return sanitized;
      }
    } catch (error) {
      // Fall through to Tier 2 and Tier 3
    }

    // TIER 2: Cache Check
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey)!;
    }

    // TIER 3: Local Fallback
    return this.getLocalFallback(text, petType);
  }

  async generateSpeech(text: string, petType: PetType): Promise<string | null> {
    try {
      const ai = this.getAI();
      const voiceName = petType === PetType.DOG ? 'Kore' : 'Puck';
      // Strip emojis for TTS
      const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{FE0F}]/gu, '').trim();
      
      if (!cleanText) return null;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) {
      return null;
    }
  }
}

export const lumiService = new GeminiService();
