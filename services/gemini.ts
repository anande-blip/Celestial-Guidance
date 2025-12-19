
import { GoogleGenAI, Type } from "@google/genai";
import { TarotCard, DeckType, SpreadConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = "gemini-3-pro-preview";
const IMAGE_MODEL = "gemini-2.5-flash-image";
const GROUNDING_MODEL = "gemini-2.5-flash";

const TAROT_SYSTEM_INSTRUCTION = `You are a mystical and wise Tarot Reader. 
Interpret the cards based on the tradition of the selected deck.
Structure your response with card-by-card analysis, synthesis, and conclusion.
Use markdown for formatting.`;

export class GeminiService {
  async getTarotReading(question: string, cards: TarotCard[], deckType: DeckType, spread: SpreadConfig): Promise<string> {
    try {
      const deckName = deckType === 'thoth' ? 'Thoth Tarot' : deckType === 'marseille' ? 'Tarot de Marseille' : 'Rider Waite Smith';
      let cardList = cards.map((card, i) => `${i + 1}. **${spread.positions[i]}**: ${card.name} ${card.isReversed ? '(Reversed)' : ''}`).join('\n');
      const prompt = `User Question: "${question || "General Outlook"}"\nSpread: ${spread.name}\nDeck: ${deckName}\n\nCards:\n${cardList}`;

      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: { systemInstruction: TAROT_SYSTEM_INSTRUCTION, temperature: 0.7 }
      });
      return response.text || "The mists are too thick. Try again.";
    } catch (error) {
      console.error(error);
      return "I sensed a disturbance in the connection.";
    }
  }

  async generateCardImage(cardName: string, deckType: DeckType): Promise<string | undefined> {
    try {
      const styles: Record<string, string> = {
        marseille: "Style: Tarot de Marseille, woodcut aesthetic.",
        thoth: "Style: Thoth Tarot, surrealist Crowley style.",
        rider: "Style: Classic Rider Waite Smith aesthetic."
      };
      const prompt = `Full tarot card illustration for '${cardName}'. ${styles[deckType] || styles.rider} Vertical. No text.`;
      const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt });
      return response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  async getSoulmateDescription(date: string, time: string, place: string, gender: string, interest: string, imageBytes?: string): Promise<any> {
    try {
      const prompt = `
        You are the Divine Celestial Oracle. Perform a profound astrological soulmate vision inspired by the deepest spiritual traditions.
        
        SEEKER BIRTH DATA:
        - Birth Date: ${date}
        - Birth Time: ${time}
        - Birth Place: "${place}"
        - Seeker Gender: ${gender}
        - Seeking: ${interest} soulmate
        ${imageBytes ? "- Seeker Aura: A visual essence (photo) has been provided. Factor this unique energy into their fated counterpart." : ""}
        
        CRITICAL INSTRUCTIONS:
        1. GROUNDING: Use Google Maps to verify "${place}". Use its coordinates for precise astrological calculations.
        2. VAGUENESS: Do NOT suggest a literal street address or the user's birthplace for the meeting. Instead, suggest poetic, public, or social environments like "a cozy hidden cafe," "a quiet art gallery," "a vibrant professional gathering," or "a serene nature retreat."
        3. TONE: Mysterious, supportive, and detailed. 
        4. JSON ONLY: No preamble, no markdown. Pure JSON.
        
        JSON STRUCTURE:
        {
          "reading": "A beautiful 2-paragraph narrative about the bond.",
          "initials": "L.M.",
          "initialsContext": "How these letters will appear as signs (e.g. on a book, a sign, or heard in a crowd).",
          "zodiacSign": "Their primary sign.",
          "zodiacCompatibility": "Why their sign (e.g. Taurus) matches the seeker's Capricorne/astrology.",
          "auraColor": "Deep Green",
          "auraDescription": "What their aura color says about their spirit.",
          "personalityTraits": ["Trait 1", "Trait 2", "Trait 3"],
          "spiritualAlignment": "Which chakra or spiritual practice they follow (e.g. Heart Chakra, Nature Yoga).",
          "spiritAnimal": "Their guardian archetype.",
          "career": "Their profession.",
          "careerMission": "The deeper impact of their work.",
          "meetingTime": "A timeframe like 'Next Autumn' or 'In about 9 months'.",
          "meetingLocation": "A poetic description of the environment (e.g. A sun-drenched bistro).",
          "meetingDetails": "The vibe of the first encounter.",
          "pastLifeConnection": "The story of your shared history.",
          "tarotCards": ["Card 1", "Card 2", "Card 3"],
          "angelNumbers": ["444", "777"],
          "visualPrompt": "Detailed physical description (must be ${interest}, photorealistic, 8k portrait, cinematic lighting)."
        }
      `;

      const contents: any = { parts: [{ text: prompt }] };
      if (imageBytes) {
        contents.parts.unshift({ inlineData: { data: imageBytes, mimeType: "image/jpeg" } });
      }

      const response = await ai.models.generateContent({
        model: GROUNDING_MODEL,
        contents,
        config: {
          tools: [{ googleMaps: {} }],
          temperature: 0.8
        }
      });

      const responseText = response.text || "";
      let jsonStr = responseText;
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const match = jsonStr.match(/\{[\s\S]*\}/);
      
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          ...parsed,
          reading: parsed.reading || "The mists reveal a soul bound to yours...",
          visualPrompt: parsed.visualPrompt || `Photorealistic 8k portrait of a beautiful ${interest} soulmate`
        };
      }
      
      throw new Error("Soulmate Oracle format error.");
    } catch (error) {
      console.error("Soulmate Oracle Error:", error);
      return { 
        reading: "Through the celestial mists, I glimpse a soul destined for yours. Born under different stars yet drawn by the same cosmic thread.",
        initials: "S.M.",
        initialsContext: "You will see these letters reflected in the patterns of your daily life.",
        zodiacSign: "Leo Sun / Libra Moon",
        zodiacCompatibility: "Their fiery passion balances your earthy resolve.",
        auraColor: "Golden Indigo",
        auraDescription: "A shield of protection and a beacon of wisdom.",
        personalityTraits: ["Empathetic", "Adventurous", "Wise"],
        spiritualAlignment: "Rooted in Ancient Earth Wisdom",
        spiritAnimal: "Golden Phoenix",
        career: "Healer of Hearts",
        careerMission: "Restoring balance to those who have lost their way.",
        meetingTime: "Within the turning of seasons",
        meetingLocation: "A luminous gathering place where spirits align",
        meetingDetails: "A shared glance that feels like coming home.",
        pastLifeConnection: "You were companions in an ancient city of light.",
        tarotCards: ["The Lovers", "The Star", "Ace of Cups"],
        angelNumbers: ["111", "222"],
        visualPrompt: `Photorealistic 8k portrait of a beautiful ${interest} with soulful eyes.`
      };
    }
  }

  async generateSoulmateImage(visualPrompt: string): Promise<string | undefined> {
    try {
      const response = await ai.models.generateContent({ 
        model: IMAGE_MODEL, 
        contents: visualPrompt + ". Portrait, 8k, photorealistic, cinematic lighting, high resolution."
      });
      return response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }
}

let geminiInstance: GeminiService | null = null;
export const getGeminiService = (): GeminiService => {
  if (!geminiInstance) geminiInstance = new GeminiService();
  return geminiInstance;
};
