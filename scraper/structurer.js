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
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

module.exports = { structureData };
