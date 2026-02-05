
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
  "Yummy! Good caretaker.",
  "I feel energized now!",
  "Thank you for dinner.",
  "That was yummy!"
];

const DRINKING_RESPONSES = [
  "Ahh, refreshing water!",
  "Just what I needed.",
  "I was getting thirsty.",
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

  private COOLDOWNS = {
    feed: 60000, 
    water: 30000,  
    pet: 1000,
    play: 20000
  };

  private getPetName(type: PetType): string {
    return type === PetType.DOG ? "Buddy" : "Luna";
  }

  private getRandomResponse(list: string[]): string {
    return list[Math.floor(Math.random() * list.length)];
  }

  async process(
    input: string,
    source: InteractionSource,
    petType: PetType,
    stats: PetStats,
    location?: string
  ): Promise<ActionResponse | null> {
    const text = input.toLowerCase();
    const name = this.getPetName(petType);
    const now = Date.now();

    const isFeeding = /feed|food|meal|dinner|kibble|eat/i.test(text);
    const isWatering = /water|drink|thirsty|hydration|serve water/i.test(text);
    const isPetting = /pet|stroke|pat|cuddle/i.test(text) || !!location;
    const isPlaying = /play|fetch|toy|game/i.test(text);

    if (isFeeding) {
      if (now - this.lastActionTime.feed < this.COOLDOWNS.feed) {
        return {
          animation: PetStatus.IDLE,
          chatMessage: `🦴 ${name} is still full.`,
          voiceText: "I'm still full, thank you.",
          statUpdate: {},
          duration: 2000
        };
      }
      this.lastActionTime.feed = now;
      return this.getFeedingAction(source, name);
    }

    if (isWatering) {
      if (now - this.lastActionTime.water < this.COOLDOWNS.water) {
        return {
          animation: PetStatus.IDLE,
          chatMessage: `💧 ${name} isn't thirsty yet.`,
          voiceText: "I'm not thirsty just yet.",
          statUpdate: {},
          duration: 2000
        };
      }
      this.lastActionTime.water = now;
      return this.getWateringAction(source, name);
    }

    if (isPetting) {
      const petLocation = location || 'head';
      let voiceText = "";
      let happinessGain = 10;

      if (petType === PetType.DOG) {
        switch(petLocation) {
          case 'ears': voiceText = "Oh, right behind the ears! *wag*"; happinessGain = 15; break;
          case 'chin': voiceText = "Aww, scritches under the chin! *happy pant*"; happinessGain = 12; break;
          case 'back': voiceText = "Long pets are the best! *tail thumps*"; break;
          default: voiceText = "You're my best friend! *lick*";
        }
      } else {
        switch(petLocation) {
          case 'ears': voiceText = "Purrr... exactly there."; happinessGain = 15; break;
          case 'chin': voiceText = "The chin is my favorite spot... *purrr*"; happinessGain = 20; break;
          case 'back': voiceText = "I love being pampered."; break;
          default: voiceText = "I'm so lucky to have you.";
        }
      }

      return {
        animation: PetStatus.PETTING,
        chatMessage: `❤️ You petted ${name}'s ${petLocation}.`,
        voiceText,
        statUpdate: { happiness: happinessGain },
        duration: 3000
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

  private getFeedingAction(source: InteractionSource, name: string): ActionResponse {
    return {
      animation: PetStatus.EATING,
      statUpdate: { hunger: 25, happiness: 15 },
      duration: 10000,
      chatMessage: `🦴 Feeding ${name}...`,
      voiceText: this.getRandomResponse(FEEDING_RESPONSES)
    };
  }

  private getWateringAction(source: InteractionSource, name: string): ActionResponse {
    return {
      animation: PetStatus.DRINKING,
      statUpdate: { thirst: 40, happiness: 5 },
      duration: 8000,
      chatMessage: `${name} drinks gratefully.`,
      voiceText: this.getRandomResponse(DRINKING_RESPONSES)
    };
  }
}

export const actionProcessor = new ActionProcessor();
