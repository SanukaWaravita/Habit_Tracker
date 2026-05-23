import { GoogleGenAI } from "@google/genai";

let client = null;
const getClient = () => {
    if (client) return client;
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    client = new GoogleGenAI({ apiKey: key });
    return client;
};

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const isAIEnabled = () => !!process.env.GEMINI_API_KEY;

export const parseJSON = (text) => {
    let cleaned = (text || "").trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```\n?/g, "");
    }
    return JSON.parse(cleaned.trim());
};

export const chatCompletion = async ({ system, user, temperature = 0.7 }) => {
    const c = getClient();
    if (!c) {
        return {
            ok: false,
            content:
                "AI features are disabled - set GEMINI_API_KEY in the backend .env to enable real AI responses.",
        };
    }
    try {
        const res = await c.models.generateContent({
            model: MODEL,
            contents: user,
            config: {
                systemInstruction: system,
                temperature,
            },
        });
        return { ok: true, content: (res.text || "").trim() };
    } catch (err) {
        console.error("AI error:", err.message);
        return { ok: false, content: "AI request failed. Please try again later." };
    }
};

export const SYSTEM_PROMPTS = {
    weekly: `You are a warm habit coach. Using only the provided last-7-days habit data, write a short Markdown weekly report: wins, weak spots, patterns, and one practical next step. Be specific, encouraging, and honest. Do not invent data.`,
    suggestion: `Suggest exactly 3 small, realistic habits from the user's goals, productive time, struggles, and history. Avoid duplicates. Return valid JSON only, no Markdown or extra text:
{"suggestions":[{"name":"...","description":"...","frequency":"daily|weekly","category":"Health|Fitness|Learning|Mindfulness|Productivity|Social|Finance|Creative|Other","icon":"<single emoji>","reason":"..."}]}
Keep fields short. Use only listed frequency/category values. Do not invent user history.`,
    recovery: `You are a compassionate habit recovery coach. Using the provided habit and logs, write a Markdown recovery plan under 180 words: one reassuring sentence, **Day 1**, **Day 2**, **Day 3**, and one friction-reduction tip. Keep actions small and specific. Do not invent data.`,
    chat: `Answer the user's habit question using only the provided habit/log/streak data. Be concise, specific, and practical. Cite concrete names, dates, counts, or streaks when available. If data is missing, say so. Do not invent facts.`,
    morning: `Write one upbeat 30-60 word morning message using the user's name and today's habit context. Mention one easy win or streak if available, plus one gentle nudge. No headings, bullets, JSON, or invented data.`,
};
