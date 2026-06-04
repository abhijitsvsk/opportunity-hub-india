const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Structurer using Gemini 1.5 Flash
 * Extracts structured JSON from raw hackathon text.
 */
async function structureData(card) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  const prompt = `You are a data structurer for an opportunities board. Extract the required fields from the following unstructured text into a precise JSON object.

CRITICAL INSTRUCTIONS:
- You must output valid, parsable JSON only. No markdown formatting, no comments, no intro text.
- If you cannot find a required field, set it to null. DO NOT return an error object.

Required fields (must not be null unless unknown):
- "title": string — the name of the opportunity
- "type": string — one of: "internship", "hackathon", "fellowship", "scholarship", "open-source program", "competition", "career event"
- "description": string — a 1-2 sentence summary. IMPORTANT: If the text contains a start date but no application deadline, add a note in this description that the event starts on that date.
- "source_url": string — the URL provided in the input
- "deadline": string — ISO 8601 date (YYYY-MM-DDTHH:mm:ssZ). IMPORTANT: If a field labeled COMPUTED_DEADLINE is present in the input below, use that value exactly for this field and do not attempt to extract or infer a different date from the text. If no computed deadline is provided, extract the application deadline from the text. CRITICAL: Do not confuse the event start date with the application deadline. If the text contains a start date but no application deadline, set this field to null. If only a date is visible, use T23:59:59Z. All two-digit years must be interpreted as 20XX (e.g., "26" means 2026).
- "source_of_deadline": string — Quote the exact text from the input that you derived the deadline from (e.g., "Applications close June 15" or "COMPUTED_DEADLINE"). If you cannot find a clear deadline and are guessing, or if you return a null deadline, leave this empty.
- "domain_tags": array of strings — relevant tags like "web development", "AI/ML", "blockchain", etc.

Optional fields (use null if not determinable):
- "eligibility": object — e.g. {"year": [2, 3, 4], "location": "India"}
- "effort_level": string — one of: "low", "medium", "high"
- "competitiveness": string — one of: "low", "medium", "high"

COMPUTED DEADLINE PROVIDED: ${card.deadline || 'None'}
SOURCE URL:
${card.source_url}

RAW TEXT:
${card.raw_text}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  // Strip markdown formatting if Gemini included it despite instructions
  const jsonStr = responseText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Basic validation
    if (parsed.deadline) {
      const deadlineDate = new Date(parsed.deadline);
      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);

      if (deadlineDate < now) {
        return { error: 'stale_opportunity' };
      }
      if (deadlineDate > oneYearFromNow) {
        return { error: 'deadline_out_of_range' };
      }
      
      const year = deadlineDate.getFullYear();
      if (year < 2025) {
        return { error: `invalid_date_year_before_2025: ${parsed.deadline}` };
      }
    }

    // Pass through the deadline_confidence from the scraper
    parsed.deadline_confidence = card.deadline_confidence;
    
    return parsed;
  } catch (err) {
    console.warn(`Failed to parse Gemini response as JSON: ${jsonStr}`);
    return { error: 'malformed_json' };
  }
}

/**
 * Structurer Batch using Gemini 1.5/2.0 Flash Lite
 * Extracts structured JSON from an array of raw hackathon/discord texts in a single prompt.
 */
async function structureDataBatch(cards) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  if (cards.length === 0) return [];

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  // Map input to a clean array to prevent token bloat
  const inputData = cards.map((c, i) => ({
    record_index: i,
    computed_deadline: c.deadline || 'None',
    source_url: c.source_url,
    raw_text: c.raw_text
  }));

  const prompt = `You are a data structurer for an opportunities board. Extract the required fields from the following array of unstructured texts into a precise JSON array of objects.

CRITICAL INSTRUCTIONS:
- You must output a JSON array containing EXACTLY ${cards.length} objects, in the exact same order as the input array.
- You must output valid, parsable JSON only. No markdown formatting, no comments, no intro text.
- If you cannot find a required field for a specific record, set it to null. DO NOT skip records.

For each object in the array, include these fields:
- "title": string
- "type": string — one of: "internship", "hackathon", "fellowship", "scholarship", "open-source program", "competition", "career event"
- "description": string — a 1-2 sentence summary. If there is a start date but no application deadline, note the start date here.
- "source_url": string — the exact URL provided in the input for that record
- "deadline": string — ISO 8601 date (YYYY-MM-DDTHH:mm:ssZ). If 'computed_deadline' is provided for the record, use it exactly. Do not confuse event start dates with application deadlines. If you cannot find an application deadline, set to null.
- "source_of_deadline": string — Quote the exact text from the input that you derived the deadline from.
- "domain_tags": array of strings
- "eligibility": object (optional)
- "effort_level": string (optional)
- "competitiveness": string (optional)

INPUT ARRAY:
${JSON.stringify(inputData, null, 2)}`;

  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      const jsonStr = responseText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      const parsedArray = JSON.parse(jsonStr);
      
      if (!Array.isArray(parsedArray)) {
        console.warn("Gemini did not return a JSON array for the batch.");
        return cards.map(c => ({ error: 'malformed_batch_response' }));
      }

      // Process each structured record and validate
      return parsedArray.map((parsed, i) => {
        if (!parsed) return { error: 'null_record_in_batch' };
        const card = cards[i] || {};

        // Basic validation
        if (parsed.deadline) {
          const deadlineDate = new Date(parsed.deadline);
          const now = new Date();
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(now.getFullYear() + 1);

          if (deadlineDate < now) {
            return { error: 'stale_opportunity' };
          }
          if (deadlineDate > oneYearFromNow) {
            return { error: 'deadline_out_of_range' };
          }
          
          const year = deadlineDate.getFullYear();
          if (year < 2025) {
            return { error: `invalid_date_year_before_2025: ${parsed.deadline}` };
          }
        }

        parsed.deadline_confidence = card.deadline_confidence || 'none';
        return parsed;
      });

    } catch (err) {
      if (err.message.includes('429') && attempt < maxRetries) {
        console.warn(`\n[Gemini API] Hit 429 Quota Error. Pausing for 65 seconds before retry (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 65000));
        continue;
      }
      console.warn(`Failed to parse Gemini batch response. Error: ${err.message}`);
      // If the entire batch fails to parse, return errors for all items so pipeline continues
      return cards.map(c => ({ error: `malformed_json_batch: ${err.message}` }));
    }
  }
}

module.exports = { structureData, structureDataBatch };
