import OpenAI from "openai";

// Semver version of the system prompt used for AI generation (DES-AI-003).
// Increment on any change to buildSystemPrompt() that affects LLM output.
export const PROMPT_VERSION = "v1.0.0";

// OpenRouter is OpenAI-compatible. Set OPENROUTER_MODEL to override the default.
// Recommended cheap+capable models: google/gemini-flash-1.5, mistralai/mistral-7b-instruct
const DEFAULT_MODEL = "google/gemini-flash-1.5";

export const llmModel = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

// Factory (not singleton) — avoids SDK key validation at module load time during Next.js build.
export function getLlmClient(): OpenAI {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    defaultHeaders: {
      "HTTP-Referer": "https://anclora.com",
      "X-Title": "AncloraVisionFlow",
    },
  });
}
