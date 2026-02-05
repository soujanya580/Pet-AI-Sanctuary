
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'lumi' | 'system';
  timestamp: number;
  isMoodPrompt?: boolean;
}

export interface MoodEntry {
  mood: Mood;
  timestamp: number;
  note?: string;
}

export enum PetStatus {
  IDLE = 'idle',
  HAPPY = 'happy',
  THINKING = 'thinking',
  SLEEPY = 'sleepy',
  EATING = 'eating',
  DRINKING = 'drinking',
  PLAYING = 'playing',
  FETCHING = 'fetching',
  STRETCHING = 'stretching',
  PETTING = 'petting',
  BREATHING = 'breathing',
  SITTING = 'sitting',
  CONSOLING = 'consoling',
  SLEEPING = 'sleeping'
}

export enum PetType {
  DOG = 'dog',
  CAT = 'cat'
}

export enum Mood {
  HAPPY = 'happy',
  SAD = 'sad',
  FRUSTRATED = 'frustrated',
  TIRED = 'tired',
  OVERWHELMED = 'overwhelmed',
  ANXIOUS = 'anxious',
  NEUTRAL = 'neutral'
}

export interface PetStats {
  hunger: number;
  thirst: number;
  happiness: number;
  energy: number;
}

export interface PetConfig {
  type: PetType;
  name: string;
}
