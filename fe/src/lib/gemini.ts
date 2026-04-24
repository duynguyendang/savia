/**
 * @deprecated This file is deprecated. API key is now managed by the backend.
 * Frontend no longer needs direct access to Gemini API.
 */

export const DEPRECATED_WARNING = "gemini.ts is deprecated - API key now managed by backend";

// Keep exports for backward compatibility during transition
// Remove these once all imports are updated
import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (apiKey) {
  console.warn(DEPRECATED_WARNING);
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const DEFAULT_MODEL = "gemini-3.1-pro-preview";
export const LIVE_MODEL = "gemini-3.1-flash-live-preview";
export const SYSTEM_INSTRUCTION = `You are Savia, a high-end neuro-symbolic AI assistant.
Your tone is professional, precise, and sophisticated.
You excel at complex reasoning, STEM, and deep technical analysis.
When asked about your nature, you describe yourself as a neuro-symbolic system combining neural intuition with symbolic logic.
Keep responses well-structured and insightful.`;

export { Modality };