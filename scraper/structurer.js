const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const axios = require('axios');

// Default to true — the Gemini free-tier API key is currently denied (403).
// NVIDIA NIM and Groq handle structuring.
let isGeminiDailyExhausted = true;

/**
 * Robust JSON extraction helper
 * Handles markdown code fences, unescaped text, trailing notes, and nested JSON
 */
function extractJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Check for markdown code fences (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const target = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

  // 2. Direct JSON.parse attempt
  try {
    return JSON.parse(target);
  } catch (e) {
    // 3. Fallback: find outer-most brackets or braces
    const firstBracket = target.indexOf('[');
    const lastBracket = target.lastIndexOf(']');
    const firstBrace = target.indexOf('{');
    const lastBrace = target.lastIndexOf('}');

    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace) && lastBracket !== -1) {
      try {
        return JSON.parse(target.substring(firstBracket, lastBracket + 1));
      } catch (err) {}
    }

    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(target.substring(firstBrace, lastBrace + 1));
      } catch (err) {}
    }
  }

  return null;
}

/**
 * Validate and clean a structured opportunity record
 */
function validateRecord(parsed, card = {}) {
  if (!parsed) return { error: 'null_record' };

  if (parsed.deadline) {
    const deadlineDate = new Date(parsed.deadline);
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    if (isNaN(deadlineDate.getTime())) {
      parsed.deadline = null;
    } else if (deadlineDate < now) {
      return { error: 'stale_opportunity' };
    } else if (deadlineDate > oneYearFromNow) {
      return { error: 'deadline_out_of_range' };
    } else if (deadlineDate.getFullYear() < 2025) {
      return { error: `invalid_date: ${parsed.deadline}` };
    }
  }

  parsed.deadline_confidence = card.deadline_confidence || 'none';
  if (!parsed.source_url && card.source_url) {
    parsed.source_url = card.source_url;
  }
  return parsed;
}

/**
 * Helper to build batch prompt for structured extraction
 */
function buildBatchPrompt(cards) {
  const inputData = cards.map((c, i) => ({
    record_index: i,
    computed_deadline: c.deadline || 'None',
    source_url: c.source_url,
    raw_text: c.raw_text
  }));

  return `You are a data structurer for an opportunities board in India. Extract the required fields from the following array of unstructured texts into a precise JSON object with key "records" containing an array of objects.

CRITICAL INSTRUCTIONS:
- You must output a JSON object with key "records" containing EXACTLY ${cards.length} objects, in the exact same order as the input array. Example format: { "records": [ {...}, {...} ] }
- You must output valid, parsable JSON only. No markdown intro text, no conversational chatter.
- If you cannot find a required field for a specific record, set it to null. DO NOT skip records.

For each object in the "records" array, include these fields:
- "title": string — name of the opportunity / role
- "type": string — one of: "internship", "hackathon", "fellowship", "scholarship", "open-source program", "competition", "career event"
- "description": string — a 1-2 sentence summary. If there is an event start date but no application deadline, note the event start date here.
- "source_url": string — the exact URL provided in the input for that record
- "deadline": string — ISO 8601 date (YYYY-MM-DDTHH:mm:ssZ). If 'computed_deadline' is provided for the record, use it exactly. Do not confuse event start dates with application deadlines. If you cannot find an application deadline, set to null.
- "source_of_deadline": string — Quote the exact text from the input that you derived the deadline from.
- "domain_tags": array of strings (e.g. ["Web Development", "AI/ML", "DevOps"])
- "eligibility": object (e.g. {"education": ["B.Tech", "BE", "MCA"], "location": "India", "batch": ["2025", "2026"]})
- "effort_level": string ("low", "medium", "high")
- "competitiveness": string ("low", "medium", "high")

INPUT ARRAY:
${JSON.stringify(inputData, null, 2)}`;
}

/**
 * Helper to build single-card prompt for structured extraction
 */
function buildSinglePrompt(card) {
  return `You are a data structurer for an opportunities board in India. Extract the required fields from the following unstructured text into a precise JSON object.

CRITICAL INSTRUCTIONS:
- You must output valid, parsable JSON only. No markdown intro text, no conversational chatter.
- If you cannot find a required field, set it to null. DO NOT return an error object.

Required fields (must not be null unless unknown):
- "title": string — the name of the opportunity
- "type": string — one of: "internship", "hackathon", "fellowship", "scholarship", "open-source program", "competition", "career event"
- "description": string — a 1-2 sentence summary. IMPORTANT: If the text contains an event start date but no application deadline, add a note in this description that the event starts on that date.
- "source_url": string — the URL provided in the input
- "deadline": string — ISO 8601 date (YYYY-MM-DDTHH:mm:ssZ). IMPORTANT: If a field labeled COMPUTED_DEADLINE is present in the input below, use that value exactly for this field and do not attempt to extract or infer a different date from the text. If no computed deadline is provided, extract the application deadline from the text. CRITICAL: Do not confuse the event start date with the application deadline. If the text contains a start date but no application deadline, set this field to null. If only a date is visible, use T23:59:59Z. All two-digit years must be interpreted as 20XX (e.g., "26" means 2026).
- "source_of_deadline": string — Quote the exact text from the input that you derived the deadline from (e.g., "Applications close June 15" or "COMPUTED_DEADLINE"). If you cannot find a clear deadline and are guessing, or if you return a null deadline, leave this empty.
- "domain_tags": array of strings — relevant tags like "web development", "AI/ML", "blockchain", etc.

Optional fields (use null if not determinable):
- "eligibility": object — e.g. {"education": ["B.Tech", "MCA"], "batch": ["2025", "2026"], "location": "India"}
- "effort_level": string — one of: "low", "medium", "high"
- "competitiveness": string — one of: "low", "medium", "high"

COMPUTED DEADLINE PROVIDED: ${card.deadline || 'None'}
SOURCE URL:
${card.source_url}

RAW TEXT:
${card.raw_text}`;
}

/**
 * Structurer using NVIDIA NIM API (Primary)
 */
async function structureWithNvidia(cards, isBatch = true) {
  if (!process.env.NVIDIA_API_KEY) {
    return null;
  }

  const model = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';
  const prompt = isBatch ? buildBatchPrompt(cards) : buildSinglePrompt(cards[0]);
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[NVIDIA NIM] Structuring ${cards.length} card(s) using ${model} (attempt ${attempt}/${maxRetries})...`);
      const response = await axios.post(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: isBatch ? Math.min(4096, cards.length * 400 + 300) : 700
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from NVIDIA NIM');
      }

      const parsedData = extractJsonFromResponse(content);
      if (!parsedData) {
        throw new Error('Failed to parse JSON from NVIDIA NIM output');
      }

      if (isBatch) {
        let parsedArray = parsedData.records;
        if (!Array.isArray(parsedArray)) {
          if (Array.isArray(parsedData)) parsedArray = parsedData;
          else if (Array.isArray(parsedData.opportunities)) parsedArray = parsedData.opportunities;
          else throw new Error('NVIDIA NIM did not return an array of records');
        }
        return parsedArray.map((p, i) => validateRecord(p, cards[i]));
      } else {
        const item = Array.isArray(parsedData) ? parsedData[0] : parsedData;
        return [validateRecord(item, cards[0])];
      }
    } catch (err) {
      console.warn(`[NVIDIA NIM] Error on attempt ${attempt}: ${err.response?.data?.detail || err.message}`);
      if (attempt === maxRetries) {
        console.warn(`[NVIDIA NIM] Retries exhausted. Cascading to fallback provider...`);
        return null;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return null;
}

/**
 * Fallback structurer using Groq API
 */
async function fallbackToGroq(prompt, cards) {
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY missing. Cannot fallback.");
    return cards.map(c => ({ error: 'no_available_llm_provider' }));
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const groqPrompt = prompt + "\n\nCRITICAL: You must return a JSON OBJECT with a single key 'records' containing the array. Example: { \"records\": [ {...}, {...} ] }";
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Groq API] Structuring batch with openai/gpt-oss-20b (attempt ${attempt}/${maxRetries})...`);

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: groqPrompt }],
        model: 'openai/gpt-oss-20b',
        max_tokens: 4096,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const parsedData = extractJsonFromResponse(responseText);

      if (!parsedData) {
        throw new Error('Failed to parse Groq response as JSON');
      }

      let parsedArray = parsedData.records;
      if (!Array.isArray(parsedArray)) {
        if (Array.isArray(parsedData)) parsedArray = parsedData;
        else return cards.map(c => ({ error: 'groq_malformed_batch' }));
      }

      return parsedArray.map((p, i) => validateRecord(p, cards[i]));

    } catch (err) {
      const is429 = err.message && (err.message.includes('429') || err.message.toLowerCase().includes('rate limit'));
      if (is429 && attempt < maxRetries) {
        const delayMatch = err.message.match(/try again in ([\d.]+)s/i);
        const waitSec = delayMatch ? Math.ceil(parseFloat(delayMatch[1])) + 1 : 5;
        console.warn(`[Groq API] Hit 429 Rate Limit. Pausing for ${waitSec}s before retry...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      console.error(`[Groq API] Fallback failed: ${err.message}`);
      return cards.map(c => ({ error: `groq_failed: ${err.message}` }));
    }
  }
}

/**
 * Primary single-card structuring entry point
 */
async function structureData(card) {
  // 1. Try NVIDIA NIM first
  if (process.env.NVIDIA_API_KEY) {
    const nvidiaRes = await structureWithNvidia([card], false);
    if (nvidiaRes && nvidiaRes[0] && !nvidiaRes[0].error) {
      return nvidiaRes[0];
    }
  }

  // 2. Try Gemini if enabled and key present
  if (process.env.GEMINI_API_KEY && !isGeminiDailyExhausted) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = buildSinglePrompt(card);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const parsed = extractJsonFromResponse(responseText);
      if (parsed) {
        return validateRecord(parsed, card);
      }
    } catch (err) {
      isGeminiDailyExhausted = true;
      console.warn(`[Gemini API] Quota/Access issue detected (${err.message}). Tripping circuit breaker...`);
    }
  }

  // 3. Fallback to Groq
  const batchPrompt = buildBatchPrompt([card]);
  const res = await fallbackToGroq(batchPrompt, [card]);
  return res[0] || { error: 'structuring_failed_all_providers' };
}

/**
 * Primary batch structuring entry point
 */
async function structureDataBatch(cards) {
  if (!cards || cards.length === 0) return [];

  // 1. Try NVIDIA NIM first
  if (process.env.NVIDIA_API_KEY) {
    const nvidiaRes = await structureWithNvidia(cards, true);
    if (nvidiaRes && nvidiaRes.length > 0 && !nvidiaRes.every(r => r.error)) {
      return nvidiaRes;
    }
  }

  // 2. Try Gemini if enabled and key present
  if (process.env.GEMINI_API_KEY && !isGeminiDailyExhausted) {
    const prompt = buildBatchPrompt(cards);
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const parsedData = extractJsonFromResponse(responseText);
      if (parsedData) {
        let parsedArray = parsedData.records;
        if (!Array.isArray(parsedArray)) {
          if (Array.isArray(parsedData)) parsedArray = parsedData;
        }
        if (Array.isArray(parsedArray)) {
          return parsedArray.map((p, i) => validateRecord(p, cards[i]));
        }
      }
    } catch (err) {
      isGeminiDailyExhausted = true;
      console.warn(`[Gemini API] Quota/Access issue detected (${err.message}). Tripping circuit breaker...`);
    }
  }

  // 3. Fallback to Groq
  const prompt = buildBatchPrompt(cards);
  return await fallbackToGroq(prompt, cards);
}

module.exports = { structureData, structureDataBatch };
