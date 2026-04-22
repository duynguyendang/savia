import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is not set. AI features will not work.");
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