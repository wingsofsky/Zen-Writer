
import { GoogleGenAI } from "@google/genai";

/**
 * Uses Gemini to provide creative writing suggestions based on story context.
 * Uses gemini-3-pro-preview for complex creative reasoning tasks.
 */
export const getAiSuggestion = async (context: string) => {
  // Always initialize with direct process.env.API_KEY per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are a literary co-writer. Based on the following snippet from a novel, provide a creative and atmospheric next few sentences. Keep the tone consistent.
      
      Snippet:
      "${context.slice(-1000)}"`,
      config: {
        // Higher temperature for more creative/varied writing output
        temperature: 0.8,
      },
    });

    // Access .text property directly (not a method)
    return response.text || "The muse is silent today...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to the AI Muse.";
  }
};

/**
 * Uses Gemini to suggest a poetic title based on the story content.
 * Uses gemini-3-flash-preview for basic text summarization tasks.
 */
export const suggestTitle = async (content: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Read this story and suggest a short, poetic title (max 5 words). 
        Return ONLY the title.
        
        Story:
        "${content.slice(0, 2000)}"`,
      });
      // Access .text property directly
      return response.text?.trim() || "Untitled Story";
    } catch (e) {
        console.error("Gemini API Error (Title Suggestion):", e);
        return "Untitled Story";
    }
};
