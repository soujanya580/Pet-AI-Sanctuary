
import { PetStatus, PetType, PetStats } from "../types";

export type InteractionSource = 'ui' | 'chat' | 'voice';

export interface ActionResponse {
  animation: PetStatus;
  chatMessage: string;
  voiceText: string;
  statUpdate: Partial<PetStats>;
  duration: number;
}

const FEEDING_RESPONSES = [
  "Mmm, delicious! Thank you!",
  "This is perfect. Thanks.",
  "Yummy! Good caretaker.",
  "My favorite flavor!",
  "I feel energized now!",
  "So tasty, thank you.",
  "Mmm, hits the spot.",
  "Thank you for dinner.",
  "That was yummy!",
  "Best meal ever!"
];

const DRINKING_RESPONSES = [
  "Ahh, refreshing water!",
  "Just what I needed.",
  "So cool and clean.",
  "This hits the spot.",
  "I was getting thirsty.",
  "Refreshing! Thank you.",
  "Cool water is best.",
  "Ahh, thank you!"
];

export class ActionProcessor {
  private lastActionTime: Record<string, number> = {
    feed: 0,
    water: 0,
    pet: 0,
    play: 0
  };

  private actionCount = 0;

  private COOLDOWNS = {
    feed: 60000, 
    water: 30000,  
    pet: 5000,
    play: 20000
  };

  private getPetName(type: PetType): string {
    switch (type) {
      case PetType.DOG: return "Buddy";
      case PetType.CAT: return "Luna";
      default: return "Pet";
    }
  }

  private shouldVoice(): boolean {
    // Increased frequency: Pet voices almost every action now
    this.actionCount++;
    return true; 
  }

  private getRandomResponse(list: string[]): string {
    return list[Math.floor(Math.random() * list.length)];
  }

  async process(
    input: string,
    source: InteractionSource,
    petType: PetType,
    stats: PetStats
  ): Promise<ActionResponse | null> {
    const text = input.toLowerCase();
    const name = this.getPetName(petType);
    const now = Date.now();

    const isFeeding = /feed|food|meal|dinner|kibble|eat/i.test(text);
    const isWatering = /water|drink|thirsty|hydration|serve water/i.test(text);
    const isPetting = /pet|stroke|pat|cuddle/i.test(text);
    const isPlaying = /play|fetch|toy|game/i.test(text);

    if (isFeeding) {
      if (now - this.lastActionTime.feed < this.COOLDOWNS.feed) {
        return {
          animation: PetStatus.IDLE,
          chatMessage: `🦴 ${name} is still full. Try playing instead?`,
          voiceText: "I'm still quite full, thank you.",
          statUpdate: {},
          duration: 3000
        };
      }
      this.lastActionTime.feed = now;
      return this.getFeedingAction(source, name, petType);
    }

    if (isWatering) {
      if (now - this.lastActionTime.water < this.COOLDOWNS.water) {
        return {
          animation: PetStatus.IDLE,
          chatMessage: `💧 ${name} isn't thirsty yet. Maybe pet her?`,
          voiceText: "I'm not thirsty just yet.",
          statUpdate: {},
          duration: 3000
        };
      }
      this.lastActionTime.water = now;
      return this.getWateringAction(source, name, petType);
    }

    if (isPetting) {
      return {
        animation: PetStatus.PETTING,
        chatMessage: `❤️ You petted ${name}.`,
        voiceText: petType === PetType.CAT ? "Purrrr... I love this." : "You're my best friend.",
        statUpdate: { happiness: 10 },
        duration: 5000
      };
    }

    if (isPlaying) {
      return {
        animation: PetStatus.PLAYING,
        chatMessage: `🎾 Playing with ${name}...`,
        voiceText: "Yay! This is so much fun!",
        statUpdate: { happiness: 20, energy: -15 },
        duration: 8000
      };
    }

    return null;
  }

  private getFeedingAction(source: InteractionSource, name: string, type: PetType): ActionResponse {
    const duration = 10000;
    const voice = this.getRandomResponse(FEEDING_RESPONSES);
    return {
      animation: PetStatus.EATING,
      statUpdate: { hunger: 25, happiness: 15 },
      duration,
      chatMessage: source === 'ui' ? `You fed ${name}.` : `🦴 Preparing ${name}'s meal...`,
      voiceText: voice
    };
  }

  private getWateringAction(source: InteractionSource, name: string, type: PetType): ActionResponse {
    const duration = 8000;
    const voice = this.getRandomResponse(DRINKING_RESPONSES);
    return {
      animation: PetStatus.DRINKING,
      statUpdate: { thirst: 40, happiness: 5 },
      duration,
      chatMessage: `${name} drinks gratefully.`,
      voiceText: voice
    };
  }
}

export const actionProcessor = new ActionProcessor();
