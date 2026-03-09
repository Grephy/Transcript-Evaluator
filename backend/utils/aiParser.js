const https = require("https");
const http = require("http");

/**
 * Parse transcript text using Ollama (local, free, no API key needed)
 * 
 * Setup: 
 *   1. Install Ollama: https://ollama.com
 *   2. Pull model: ollama pull llama3.1
 *   3. Ollama runs automatically on localhost:11434
 */
async function parseWithAI(rawText, university = "Unknown") {
  const ollamaHost = process.env.OLLAMA_HOST || "localhost";
  const ollamaPort = parseInt(process.env.OLLAMA_PORT || "11434");
  const model = process.env.OLLAMA_MODEL || "llama3.1";

  console.log(`→ Sending to Ollama (${model}) at ${ollamaHost}:${ollamaPort}...`);

  // Check if Ollama is running first
  await checkOllamaRunning(ollamaHost, ollamaPort);

  const prompt = buildPrompt(rawText, university);

  const responseText = await callOllama(ollamaHost, ollamaPort, model, prompt);
  console.log("→ Ollama raw response (first 300 chars):", responseText.substring(0, 300));

  const courses = extractJSON(responseText);
  if (!courses || courses.length === 0) {
    throw new Error("Ollama returned no courses. Model may need more context or a different prompt.");
  }

  const normalized = courses
    .filter(c => c.title && c.grade)
    .map((c, i) => ({
      code: c.code || `SUB${String(i + 1).padStart(3, "0")}`,
      title: String(c.title).trim(),
      grade: normalizeGrade(String(c.grade)),
      credits: parseFloat(c.credits) || 3,
    }));

  console.log(`→ Ollama extracted ${normalized.length} courses`);
  return normalized;
}

function buildPrompt(rawText, university) {
  // Keep prompt short and very directive — smaller models need clear instructions
  return `You are extracting course data from a university transcript OCR scan.

University: ${university}

TASK: Extract every subject/course from the text below.
Return ONLY a JSON array. No explanation. No markdown. No backticks.

Each object must have:
- "code": course code if visible, else "SUB001", "SUB002" etc
- "title": subject/course name (clean up OCR noise)
- "grade": marks or grade as string e.g. "78" or "B+" or "78%"
- "credits": credit hours as number, default 3 if not shown

IGNORE: student name, enrollment number, university name, totals, SGPA, CGPA, headers.

Example output:
[{"code":"SUB001","title":"Management Principles","grade":"72","credits":3}]

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
        temperature: 0.1,    // low temp = more deterministic, better for extraction
        num_predict: 2000,   // enough tokens for a full transcript
        stop: ["\n\n\n"],    // stop on triple newline to avoid rambling
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

    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error("Ollama timed out after 2 minutes. Try a smaller model like llama3.2 or phi3."));
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

  // Find JSON array anywhere in the response
  const arrayMatch = text.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }

  // Strip markdown code fences and try again
  const stripped = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(stripped); } catch {}

  // Last resort: find the first [ and last ] and try that
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }

  return null;
}

function normalizeGrade(grade) {
  if (!grade) return "0%";
  const s = String(grade).trim();
  if (s.includes("%")) return s;
  if (/^[A-F][+-]?$/.test(s)) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return s + "%";
  return s;
}

module.exports = { parseWithAI };
