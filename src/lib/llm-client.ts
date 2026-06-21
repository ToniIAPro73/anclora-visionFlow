import OpenAI from "openai";

// OpenRouter is OpenAI-compatible. Set OPENROUTER_MODEL to override the default.
// Recommended cheap+capable models: google/gemini-flash-1.5, mistralai/mistral-7b-instruct
const DEFAULT_MODEL = "google/gemini-flash-1.5";

export const llmClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  defaultHeaders: {
    "HTTP-Referer": "https://anclora.com",
    "X-Title": "AncloraVisionFlow",
  },
});

export const llmModel = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
