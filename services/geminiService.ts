import { GoogleGenAI, Type } from "@google/genai";
import { Garment, StylingSuggestion, VerificationResult } from "../types.ts";

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async verifyAuthenticity(tagId: string): Promise<VerificationResult> {
    const ai = this.getAI();
    const prompt = `Perform a high-security authenticity check for NFC Tag ID: ${tagId}.
    
    CRITERIA:
    - If ID starts with 'AXS-', it is likely a 'verified original'.
    - If ID starts with 'SUS-', it is 'fake'.
    - Provide a status ('original', 'fake', or 'unknown').
    - If 'original', provide a celebratory message.
    - If 'fake', use the message 'Not Recognised' and the details 'Unknown Tag'.
    - If 'unknown', mention a communication failure.
    
    Return as JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            message: { type: Type.STRING },
            details: { type: Type.STRING }
          },
          required: ["status", "message", "details"]
        }
      }
    });

    return JSON.parse(response.text || '{"status": "unknown", "message": "Connection Lost", "details": "ERR_PULSE_FAILED"}');
  }

  async getStylingAdvice(wardrobe: Garment[], prompt: string = "a casual day out"): Promise<StylingSuggestion> {
    const ai = this.getAI();
    const itemsList = wardrobe.map(i => `${i.name} (Category: ${i.type}, Gender: ${i.gender})`).join(', ');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are an elite AI Fashion Stylist. Given the user's available wardrobe: [${itemsList}]. 
      The user is dressing for this occasion: "${prompt}". 
      Select 3-4 specific items from the list and explain how to combine them. 
      Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            advice: { type: Type.STRING },
            combination: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "advice", "combination"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  }
}

export const geminiService = new GeminiService();