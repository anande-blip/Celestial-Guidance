
export type DeckType = 'rider' | 'marseille' | 'thoth';
export type MembershipLevel = 'guest' | 'initiate' | 'adept' | 'master';

export interface TarotCard {
  id: string;
  name: string;
  image?: string; // Base64 data URI
  isLoadingImage?: boolean;
  meaningUpright: string;
  meaningReversed: string;
  isReversed: boolean;
}

export interface Reading {
  question: string;
  cards: TarotCard[];
  interpretation: string;
}

export interface SpreadConfig {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  positions: string[];
  icon?: string;
  imageUrl: string;
  isPremium?: boolean;
}

export interface OracleProfile {
  id: string;
  name: string;
  title: string;
  description: string;
  imagePrompt: string;
  baseImage: string;
  videoUrl?: string; // For iFrame based videos
  simliFaceId?: string; // Simli Face ID for synchronized lip-sync
  simliApiKey?: string; // Specific Simli API Key if different from global
  price: number;
  tags: string[];
}

export interface SoulmateReading {
    reading: string;
    visualPrompt: string;
    imageUrl?: string;
    initials: string;
    initialsContext: string;
    zodiacSign: string;
    zodiacCompatibility: string;
    auraColor: string;
    auraDescription: string;
    personalityTraits: string[];
    spiritualAlignment: string;
    spiritAnimal: string;
    career: string;
    careerMission: string;
    meetingTime: string;
    meetingLocation: string;
    meetingDetails: string;
    pastLifeConnection: string;
    tarotCards: string[];
    angelNumbers: string[];
}

export type AppState = 'home' | 'spread-selection' | 'shuffling' | 'picking' | 'revealing' | 'reading' | 'soulmate-form' | 'soulmate-processing' | 'soulmate-result';
