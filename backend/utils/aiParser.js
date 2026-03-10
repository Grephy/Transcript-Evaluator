const http = require("http");

// ─── Grade scale detection (done in JS, not by Ollama) ───────────────────────
// We detect the scale ourselves from the text so Ollama doesn't have to guess.

function detectGradeScale(text) {
  const t = text.toLowerCase();

  // 10-point letter scale indicators (Indian universities like ABS)
  // Look for grade tables or known patterns
  if (
    /\b(a\+|a\s*=\s*9|b\+\s*=\s*8|90[-–]100.*a\+|outstanding.*10|a\+.*10)\b/i.test(text) ||
    /grade.*scale.*10/i.test(text) ||
    /\bpgdm\b/i.test(text) ||         // Post Graduate Diploma in Management — almost always ABS-style
    /aicte\s*id/i.test(text) ||        // AICTE ID — Indian institution marker
    /abs\/pgdm/i.test(text)
  ) {
    return "10point_letter";
  }

  // IIT-style 10-point numeric (SPI/CPI grading)
  if (
    /\b(spi|cpi|sgpa|cgpa)\b/i.test(text) &&
    /\b(iit|nit|bits)\b/i.test(text)
  ) {
    return "10point_numeric";
  }

  // Percentage scale (most Indian state universities)
  if (
    /\b(vtu|anna university|jntu|mumbai university|pune university|osmania)\b/i.test(t) ||
    /\b(marks?\s*obtained|max\s*marks|out\s*of\s*100)\b/i.test(text) ||
    /\b[5-9]\d\s*%/.test(text)   // numbers like 78% or 85%
  ) {
    return "percentage";
  }

  // US-style letter grades (foreign universities, some private Indian)
  if (/\b(gpa|grade\s*points?)\s*[:\-]\s*[0-4]\.\d/i.test(text)) {
    return "us_letter";
  }

  // Scan actual grade values in the text to make a best guess
  const gradeMatches = text.match(/\b([A-E][+]?|\d{2,3}|\d\.\d)\s+(?=\d|\n)/g) || [];
  const hasPercentRange = /\b[5-9]\d\b/.test(text) && !/\b[A-E]\b/.test(text);
  if (hasPercentRange) return "percentage";

  // Default for Indian transcripts with letter grades
  return "10point_letter";
}

// ─── OCR text cleaner ─────────────────────────────────────────────────────────
function cleanOCRText(raw, maxChars = 4000) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const freq = {};
  for (const l of lines) freq[l] = (freq[l] || 0) + 1;
  const noiseThreshold = Math.max(3, lines.length * 0.1);

  const cleaned = lines.filter(l => {
    if (freq[l] > noiseThreshold) return false;
    if (l.length < 3) return false;
    if (/^[-=_|~*#^]{3,}$/.test(l)) return false;
    return true;
  });

  const deduped = cleaned.filter((l, i) => i === 0 || l !== cleaned[i - 1]);
  const result = deduped.join("\n");

  if (result.length > maxChars) {
    const half = Math.floor(maxChars / 2);
    return result.slice(0, half) + "\n...[continues]...\n" + result.slice(result.length - half);
  }
  return result;
}

// ─── Grade conversion tables ──────────────────────────────────────────────────

// Indian 10-point letter → WES (maps underlying % range, not letter-for-letter)
// A+=90-100%, A=80-89%, B+=70-79%, B=60-69%, C=50-59%, D=40-49%, E=<40%
const INDIAN_LETTER_TO_WES = {
  "A+": { gpa: 4.0, letter: "A"  },
  "A":  { gpa: 3.3, letter: "B+" },
  "B+": { gpa: 2.7, letter: "B-" },
  "B":  { gpa: 2.0, letter: "C"  },
  "C":  { gpa: 1.3, letter: "D+" },
  "D":  { gpa: 0.7, letter: "D-" },
  "E":  { gpa: 0.0, letter: "F"  },
};

// Standard US letter grades
const US_LETTER_TO_WES = {
  "A+": { gpa: 4.0, letter: "A"  }, "A":  { gpa: 4.0, letter: "A"  }, "A-": { gpa: 3.7, letter: "A-" },
  "B+": { gpa: 3.3, letter: "B+" }, "B":  { gpa: 3.0, letter: "B"  }, "B-": { gpa: 2.7, letter: "B-" },
  "C+": { gpa: 2.3, letter: "C+" }, "C":  { gpa: 2.0, letter: "C"  }, "C-": { gpa: 1.7, letter: "C-" },
  "D+": { gpa: 1.3, letter: "D+" }, "D":  { gpa: 1.0, letter: "D"  }, "D-": { gpa: 0.7, letter: "D-" },
  "F":  { gpa: 0.0, letter: "F"  }, "E":  { gpa: 0.0, letter: "F"  },
};

// Percentage → WES
const PERCENTAGE_TO_WES = [
  { min: 90, max: 100, gpa: 4.0, letter: "A"  },
  { min: 85, max: 89,  gpa: 3.7, letter: "A-" },
  { min: 80, max: 84,  gpa: 3.3, letter: "B+" },
  { min: 75, max: 79,  gpa: 3.0, letter: "B"  },
  { min: 70, max: 74,  gpa: 2.7, letter: "B-" },
  { min: 65, max: 69,  gpa: 2.3, letter: "C+" },
  { min: 60, max: 64,  gpa: 2.0, letter: "C"  },
  { min: 55, max: 59,  gpa: 1.7, letter: "C-" },
  { min: 50, max: 54,  gpa: 1.3, letter: "D+" },
  { min: 45, max: 49,  gpa: 1.0, letter: "D"  },
  { min:  0, max: 44,  gpa: 0.0, letter: "F"  },
];

// IIT-style 10-point numeric
const TEN_POINT_TO_WES = [
  { min: 9.5, max: 10,  gpa: 4.0, letter: "A"  },
  { min: 8.5, max: 9.4, gpa: 3.7, letter: "A-" },
  { min: 7.5, max: 8.4, gpa: 3.3, letter: "B+" },
  { min: 6.5, max: 7.4, gpa: 3.0, letter: "B"  },
  { min: 5.5, max: 6.4, gpa: 2.3, letter: "C+" },
  { min: 4.5, max: 5.4, gpa: 1.7, letter: "C-" },
  { min: 0,   max: 4.4, gpa: 0.0, letter: "F"  },
];

function convertGrade(grade, scale) {
  if (!grade || grade === "") return { gpa: 0.0, letter: "N/A" };
  const s = String(grade).trim().toUpperCase().replace("%", "");

  if (scale === "10point_letter") {
    return INDIAN_LETTER_TO_WES[s] || { gpa: 0.0, letter: "N/A" };
  }
  if (scale === "us_letter") {
    return US_LETTER_TO_WES[s] || { gpa: 0.0, letter: "N/A" };
  }
  if (scale === "10point_numeric") {
    const n = parseFloat(s);
    if (!isNaN(n)) {
      for (const row of TEN_POINT_TO_WES) {
        if (n >= row.min && n <= row.max) return { gpa: row.gpa, letter: row.letter };
      }
    }
  }
  // percentage
  const n = parseFloat(s);
  if (!isNaN(n)) {
    for (const row of PERCENTAGE_TO_WES) {
      if (n >= row.min && n <= row.max) return { gpa: row.gpa, letter: row.letter };
    }
  }
  // fallback: try letter lookup
  return US_LETTER_TO_WES[s] || { gpa: 0.0, letter: "N/A" };
}

// ─── OCR typo correction ──────────────────────────────────────────────────────
function fixOCRTitle(title) {
  return title
    .replace(/\bAoolications\b/gi, "Applications")
    .replace(/\bManasement\b/gi, "Management")
    .replace(/\bStrateBic\b/gi, "Strategic")
    .replace(/\bAnalvtics\b/gi, "Analytics")
    .replace(/\bSurnnrer\b/gi, "Summer")
    .replace(/\bConrmunication\b/gi, "Communication")
    .replace(/\bComorate\b/gi, "Corporate")
    .replace(/\bRestructudng\b/gi, "Restructuring")
    .replace(/\bSrrall\b/gi, "Small")
    .replace(/\bMarketins\b/gi, "Marketing")
    .replace(/\bProj\s+ect\b/gi, "Project")
    .replace(/\bSubiect\b/gi, "Subject")
    .replace(/\bInternsl\b/gi, "Internal")
    .replace(/lnternational/g, "International")
    .replace(/lntegrated/g, "Integrated")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Main exported function ───────────────────────────────────────────────────
async function parseWithAI(rawText, university = "Unknown") {
  const ollamaHost = process.env.OLLAMA_HOST || "localhost";
  const ollamaPort = parseInt(process.env.OLLAMA_PORT || "11434");
  const model = process.env.OLLAMA_MODEL || "llama3.1";

  // Detect scale in JS — don't leave it to Ollama
  const scale = detectGradeScale(rawText);
  console.log(`→ Grade scale detected: ${scale}`);

  await checkOllamaRunning(ollamaHost, ollamaPort);
  console.log(`→ Sending to Ollama (${model})...`);

  const cleanText = cleanOCRText(rawText);
  console.log(`→ Text: ${rawText.length} chars → cleaned: ${cleanText.length} chars`);

  const prompt = buildPrompt(cleanText, scale);
  const responseText = await callOllama(ollamaHost, ollamaPort, model, prompt);
  console.log("→ Ollama response (first 300 chars):", responseText.substring(0, 300));

  const raw = extractJSON(responseText);
  if (!raw || raw.length === 0) {
    throw new Error("Ollama returned no courses. OCR text may be too noisy or Ollama needs more context.");
  }

  // Normalize, fix OCR typos, convert grades
  const normalized = raw
    .filter(c => c.title && isRealCourse(c.title))
    .map((c, i) => {
      const cleanTitle = fixOCRTitle(String(c.title).trim());
      const { gpa, letter } = convertGrade(String(c.grade || ""), scale);
      return {
        code: `SUB${String(i + 1).padStart(3, "0")}`,
        title: cleanTitle,
        grade: String(c.grade || "").trim(),
        credits: parseFloat(c.credits) || 3,
        usCredits: parseFloat(c.credits) || 3,
        gradeScaleType: scale,
        convertedGPA: gpa,
        usGrade: letter,
      };
    })
    // Deduplicate by title
    .filter((c, i, arr) =>
      arr.findIndex(x => x.title.toLowerCase() === c.title.toLowerCase()) === i
    );

  console.log(`→ Final: ${normalized.length} courses`);
  return normalized;
}

function buildPrompt(text, scale) {
  const scaleDesc = {
    "10point_letter": "Indian 10-point LETTER scale. Grades are: A+, A, B+, B, C, D, E. Extract the letter exactly.",
    "10point_numeric": "Indian/IIT 10-point NUMERIC scale. Grades are numbers like 8, 9.5, 7. Extract the number.",
    "percentage": "Percentage scale. Grades are numbers like 78, 85, 92. Extract the number.",
    "us_letter": "US letter grade scale. Grades are A, A-, B+, B, C+, C, D, F. Extract the letter exactly.",
  }[scale] || "Extract the grade exactly as shown.";

  return `Extract all courses from this university transcript. Return ONLY a JSON array. No explanation, no markdown, no backticks.

Grading system in this transcript: ${scaleDesc}

This transcript has TWO COLUMNS side by side. The OCR merges them into one line. Example:
  "Management Principles & Business Statistics & Quantitative"
  "3 B 3 C"
means TWO courses: "Management Principles" grade B, AND "Business Statistics & Quantitative Techniques" grade C.
ALWAYS split merged two-column rows into SEPARATE objects.

Each course object:
{"code":"SUB001","title":"Full Course Name","grade":"B","credits":3}

Rules:
- One object per course. Split two-column rows.
- Fix obvious OCR typos in titles (e.g. "StrateBic"→"Strategic")
- Grade: copy exactly as shown (A+, B, C, D, E, or number)
- Credits: number shown, default 3
- SKIP: student name, enrollment number, CGPA, SGPA, semester headers, grade scale table rows, standalone numbers

TRANSCRIPT:
${text}

JSON ARRAY:`;
}

function callOllama(host, port, model, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model, prompt, stream: false,
      options: { temperature: 0.0, num_predict: 4000, stop: ["\n\n\n"] },
    });
    const req = http.request({
      hostname: host, port, path: "/api/generate", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(`Ollama error: ${parsed.error}`));
          resolve(parsed.response || "");
        } catch (e) { reject(new Error(`Failed to parse Ollama response: ${e.message}`)); }
      });
    });
    req.setTimeout(300000, () => { req.destroy(); reject(new Error("Ollama timed out.")); });
    req.on("error", e => reject(new Error(e.code === "ECONNREFUSED" ? "Ollama not running. Run: ollama serve" : e.message)));
    req.write(body);
    req.end();
  });
}

function checkOllamaRunning(host, port) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: host, port, path: "/api/tags", method: "GET" }, res => { res.resume(); resolve(); });
    req.setTimeout(3000, () => { req.destroy(); reject(new Error("Ollama not running. Run: ollama serve")); });
    req.on("error", () => reject(new Error("Ollama not running. Install from https://ollama.com")));
    req.end();
  });
}

function extractJSON(text) {
  try { return JSON.parse(text.trim()); } catch {}
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  const start = text.indexOf("["), end = text.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  return null;
}

function isRealCourse(title) {
  if (!title || title.length < 4) return false;
  const t = title.trim();
  if (/^\d+$/.test(t)) return false;
  if (/^(management|sem|subject|name|credit|grade|total|cgpa|sgpa|year|course|pass|fail|i|ii|iii|iv|v)$/i.test(t)) return false;
  // Single word that's clearly a leftover fragment (e.g. "Governance", "Techniques" alone)
  if (/^(governance|techniques|applications|restructuring|behaviour|communication)$/i.test(t)) return false;
  const alphaRatio = (t.match(/[a-zA-Z]/g) || []).length / t.length;
  if (alphaRatio < 0.4) return false;
  // OCR line-overflow fragments: start with lowercase then space then uppercase
  if (/^[a-z]{1,8}\s+[A-Z]/.test(t)) return false;
  return true;
}

module.exports = {
  parseWithAI,
  cleanOCRText,
  detectGradeScale,
  convertGrade,
};