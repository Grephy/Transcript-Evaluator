const http = require("http");

// ─── University grading scale registry ───────────────────────────────────────
// Maps known universities / schools to their grading system so the prompt
// can tell Ollama exactly how to interpret the grades it sees.
const UNIVERSITY_GRADE_SCALES = {
  // ABS (Asian Business School) — 10-point letter scale
  "asian business school": {
    type: "10point_letter",
    note: "Grades are letter grades on a 10-point scale: A+=10(90-100%), A=9(80-89%), B+=8(70-79%), B=7(60-69%), C=6(50-59%), D=5(40-49%), E=0(≤39%). Extract the letter grade exactly as shown (A+, A, B+, B, C, D, E).",
  },
  "abs": {
    type: "10point_letter",
    note: "Grades are letter grades on a 10-point scale: A+=10(90-100%), A=9(80-89%), B+=8(70-79%), B=7(60-69%), C=6(50-59%), D=5(40-49%), E=0(≤39%). Extract the letter grade exactly as shown (A+, A, B+, B, C, D, E).",
  },
  // IIT grading (10-point CPI/SPI scale)
  "iit bombay": {
    type: "10point_numeric",
    note: "Grades are numeric on a 10-point scale (e.g. 8, 9, 10). Extract the numeric grade as-is.",
  },
  "iit delhi": {
    type: "10point_numeric",
    note: "Grades are numeric on a 10-point scale (e.g. 8, 9, 10). Extract the numeric grade as-is.",
  },
  "iit madras": {
    type: "10point_numeric",
    note: "Grades are numeric on a 10-point scale (e.g. 8, 9, 10). Extract the numeric grade as-is.",
  },
  // Standard percentage-based universities
  "vtu": {
    type: "percentage",
    note: "Grades are percentages (0-100). Extract the numeric percentage value.",
  },
  "anna university": {
    type: "percentage",
    note: "Grades are percentages (0-100). Extract the numeric percentage value.",
  },
  "mumbai university": {
    type: "percentage",
    note: "Grades are percentages (0-100). Extract the numeric percentage value.",
  },
  "jntu": {
    type: "percentage",
    note: "Grades are percentages (0-100). Extract the numeric percentage value.",
  },
  "pune university": {
    type: "percentage",
    note: "Grades are percentages (0-100). Extract the numeric percentage value.",
  },
  "delhi university": {
    type: "percentage",
    note: "Grades are percentages (0-100). Extract the numeric percentage value.",
  },
};

/**
 * Detect grading scale from university name or raw transcript text.
 * Falls back to scanning the text for a grade key table.
 */
function detectGradeScale(university, rawText) {
  // Try known universities first
  const uniLower = (university || "").toLowerCase();
  for (const [key, scale] of Object.entries(UNIVERSITY_GRADE_SCALES)) {
    if (uniLower.includes(key)) return scale;
  }

  // Scan OCR text for a grade key table (e.g. "90-100 A+ 10 Outstanding")
  const hasNumericScale = /\b(9|10)\s*(outstanding|excellent)/i.test(rawText);
  const hasLetterPercent = /\b(90[-–]100|80[-–]89)\b.*\b(A\+?|A)\b/i.test(rawText);

  if (hasNumericScale || hasLetterPercent) {
    // Try to extract the actual scale from the text
    const scaleNote = extractGradeTableFromText(rawText);
    if (scaleNote) return { type: "detected", note: scaleNote };
  }

  // Default: assume percentage
  return {
    type: "percentage",
    note: "Grades are likely percentages (0-100) or standard US letter grades (A, B+, etc.).",
  };
}

/**
 * Try to find and describe a grade table embedded in the OCR text.
 * Returns a human-readable description for the prompt, or null.
 */
function extractGradeTableFromText(text) {
  // Look for patterns like "90-100 A+ 10 Outstanding" or "80-89 A 9 Excellent"
  const rows = [];
  const rowPattern = /(\d{2,3})\s*[-–]\s*(\d{2,3})\s+([A-E][+]?)\s+(\d{1,2})/g;
  let match;
  while ((match = rowPattern.exec(text)) !== null) {
    rows.push(`${match[1]}-${match[2]}% = ${match[3]} (${match[4]} pts)`);
    if (rows.length >= 5) break;
  }
  if (rows.length >= 3) {
    return `This transcript uses a custom grading scale found in the document: ${rows.join(", ")}. Extract the letter grade exactly as shown.`;
  }
  return null;
}

// ─── OCR text cleaner ─────────────────────────────────────────────────────────

/**
 * Strip OCR noise before sending to Ollama.
 * Goals:
 *  - Remove watermark/background text that repeats (e.g. "Asian Business School" 50x)
 *  - Collapse excess whitespace
 *  - Keep only lines that are likely to contain course data
 *  - Cap total length so the prompt stays within model context
 */
function cleanOCRText(raw, maxChars = 3000) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

  // Count how often each line appears — repeated lines are watermark noise
  const freq = {};
  for (const l of lines) freq[l] = (freq[l] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  // A line appearing more than 3 times AND more than 10% of total lines is noise
  const noiseThreshold = Math.max(3, lines.length * 0.1);

  const cleaned = lines.filter(l => {
    // Drop high-frequency watermark lines
    if (freq[l] > noiseThreshold) return false;
    // Drop very short lines that are just symbols or single chars
    if (l.length < 3) return false;
    // Drop lines that are pure separators
    if (/^[-=_|~]+$/.test(l)) return false;
    return true;
  });

  // Deduplicate consecutive identical lines
  const deduped = cleaned.filter((l, i) => i === 0 || l !== cleaned[i - 1]);

  const result = deduped.join("\n");

  // Hard cap — truncate if still too long, but keep the end (grade table is often at bottom)
  if (result.length > maxChars) {
    const half = Math.floor(maxChars / 2);
    return result.slice(0, half) + "\n...\n" + result.slice(result.length - half);
  }
  return result;
}

// ─── Main exported function ───────────────────────────────────────────────────

/**
 * Parse transcript text using Ollama (local, free, no API key needed)
 *
 * Setup:
 *   1. Install Ollama: https://ollama.com
 *   2. Pull a model: ollama pull llama3.1
 *   3. Ollama runs automatically on localhost:11434
 */
async function parseWithAI(rawText, university = "Unknown") {
  const ollamaHost = process.env.OLLAMA_HOST || "localhost";
  const ollamaPort = parseInt(process.env.OLLAMA_PORT || "11434");
  const model = process.env.OLLAMA_MODEL || "llama3.1";

  console.log(`→ Sending to Ollama (${model}) at ${ollamaHost}:${ollamaPort}...`);
  await checkOllamaRunning(ollamaHost, ollamaPort);

  // Clean OCR noise before building the prompt
  const cleanText = cleanOCRText(rawText);
  console.log(`→ OCR text: ${rawText.length} chars → cleaned to ${cleanText.length} chars`);

  const gradeScale = detectGradeScale(university, rawText); // use raw for scale detection
  console.log(`→ Grade scale detected: ${gradeScale.type}`);

  const prompt = buildPrompt(cleanText, university, gradeScale);
  const responseText = await callOllama(ollamaHost, ollamaPort, model, prompt);
  console.log("→ Ollama raw response (first 400 chars):", responseText.substring(0, 400));

  const courses = extractJSON(responseText);
  if (!courses || courses.length === 0) {
    throw new Error("Ollama returned no courses. Model may need more context or a different prompt.");
  }

  const normalized = courses
    .filter(c => c.title && c.grade)
    .map((c, i) => ({
      code: c.code || `SUB${String(i + 1).padStart(3, "0")}`,
      title: String(c.title).trim(),
      grade: normalizeGrade(String(c.grade), gradeScale.type),
      credits: parseFloat(c.credits) || 3,
      gradeScaleType: gradeScale.type,
    }));

  console.log(`→ Ollama extracted ${normalized.length} courses`);
  return normalized;
}

function buildPrompt(rawText, university, gradeScale) {
  return `You are extracting course data from a university transcript OCR scan.

University: ${university}
Grading System: ${gradeScale.note}

TASK: Extract EVERY subject/course listed in the transcript below.
Return ONLY a JSON array. No explanation. No markdown. No backticks. No extra text.

Rules:
- Include ALL courses, even if the grade is missing (use "" for missing grades)
- "code": course/subject code if visible, else auto-generate "SUB001", "SUB002" etc.
- "title": clean subject/course name — fix obvious OCR typos but keep the real name
- "grade": extract the grade EXACTLY as it appears (e.g. "B+", "C", "A", "D"). Do NOT convert or interpret.
- "credits": credit hours as a number, default 3 if not shown
- Do NOT merge or split courses — one object per course row

IGNORE: student name, enrollment number, university name, CGPA, SGPA, semester totals, table headers, signatures.

Example output for this grading system:
[{"code":"SUB001","title":"Management Principles","grade":"B","credits":3},{"code":"SUB002","title":"Financial Management","grade":"D","credits":3}]

TRANSCRIPT TEXT:
${rawText}

JSON ARRAY:`;
}

function callOllama(host, port, model, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.0,    // fully deterministic — extraction not creativity
        num_predict: 4000,   // increased: long transcripts need more tokens
        stop: ["\n\n\n"],
      },
    });

    const req = http.request({
      hostname: host,
      port,
      path: "/api/generate",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(`Ollama error: ${parsed.error}`));
          resolve(parsed.response || "");
        } catch (e) {
          reject(new Error(`Failed to parse Ollama response: ${e.message}`));
        }
      });
    });

    req.setTimeout(300000, () => {
      req.destroy();
      reject(new Error("Ollama timed out after 5 minutes. Try a faster model: OLLAMA_MODEL=llama3.2 node test-ollama.js ..."));
    });

    req.on("error", (e) => {
      if (e.code === "ECONNREFUSED") {
        reject(new Error("Ollama is not running. Start it with: ollama serve"));
      } else {
        reject(new Error(`Ollama connection error: ${e.message}`));
      }
    });

    req.write(body);
    req.end();
  });
}

function checkOllamaRunning(host, port) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: host, port, path: "/api/tags", method: "GET" }, (res) => {
      res.resume();
      resolve();
    });
    req.setTimeout(3000, () => { req.destroy(); reject(new Error("Ollama is not running. Run: ollama serve")); });
    req.on("error", () => reject(new Error("Ollama is not running. Install from https://ollama.com then run: ollama pull llama3.1")));
    req.end();
  });
}

function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text.trim()); } catch {}

  // Strip markdown code fences and try again
  const stripped = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(stripped); } catch {}

  // Find JSON array — use greedy match to capture full array (not just first object)
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }

  return null;
}

/**
 * Normalize grade string based on the detected scale type.
 * For letter-grade scales: keep as-is (B+, C, A, D).
 * For percentage scales: ensure % suffix.
 * For numeric 10-point: keep as-is.
 */
function normalizeGrade(grade, scaleType = "percentage") {
  if (!grade || grade === "") return "";
  const s = String(grade).trim();

  // Always preserve letter grades exactly
  if (/^[A-Ea-e][+]?$/.test(s)) return s.toUpperCase();

  // Percentage
  if (scaleType === "percentage") {
    if (s.includes("%")) return s;
    if (/^\d+(\.\d+)?$/.test(s)) return s + "%";
  }

  // 10-point numeric — keep as-is
  if (scaleType === "10point_numeric") {
    return s;
  }

  return s;
}

module.exports = {
  parseWithAI,
  detectGradeScale,
  cleanOCRText,
  UNIVERSITY_GRADE_SCALES,
};