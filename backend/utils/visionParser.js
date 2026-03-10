const http  = require("http");
const fs    = require("fs");
const path  = require("path");
const { spawnSync } = require("child_process");
const os    = require("os");
const sharp = require("sharp");

// Import grade conversion from aiParser
const { detectGradeScale, convertGrade, fixOCRTitle } = require("./aiParser");

/**
 * Parse transcript by sending the image directly to llava.
 * Returns courses in same format as parseWithAI.
 */
async function parseWithVision(pdfPath, rawText) {
  const model = process.env.OLLAMA_VISION_MODEL || "llava";
  const host  = process.env.OLLAMA_HOST  || "localhost";
  const port  = parseInt(process.env.OLLAMA_PORT || "11434");

  const scale = detectGradeScale(rawText || "");
  console.log(`→ [vision] grade scale: ${scale}`);

  const imageBase64 = await pdfToBase64Image(pdfPath);
  console.log(`→ [vision] sending image to ${model}...`);

  const prompt = `This is a university transcript. Look carefully at the course table.

The table has columns: Subject Name | Credit | Grade
There may be TWO sets of these columns side by side (left half and right half of the page).
Read ALL rows from BOTH columns.

Return ONLY a JSON array. No explanation, no markdown, no backticks.
Format: [{"code":"SUB001","title":"Course Name","grade":"B","credits":3}, ...]

Rules:
- Read EVERY course row including both left and right columns
- Copy the exact grade letter from the Grade column (A+, A, B+, B, C, D, E)
- If a course name spans two lines, combine them into one title
- Do NOT invent courses not visible in the image
- Skip: student name, enrollment number, CGPA/SGPA totals, headers

JSON:`;

  const responseText = await callOllamaVision(host, port, model, prompt, imageBase64);
  console.log(`→ [vision] response (first 200 chars): ${responseText.substring(0, 200)}`);

  const raw = extractJSON(responseText);
  if (!raw || raw.length === 0) {
    throw new Error(`Vision model (${model}) returned no courses`);
  }

  // Detect hallucination: if most titles are generic like "Course Name", "Subject Name" etc.
  const hallucinated = raw.filter(c => /^(course|subject)\s*(name)?$/i.test((c.title||"").trim()));
  if (hallucinated.length > raw.length * 0.3) {
    throw new Error(`Vision model (${model}) is hallucinating generic titles — not reading the image`);
  }

  // Normalize to same format as parseWithAI
  const courses = raw
    .filter(c => c.title && c.title.length > 4 && !/^(course|subject)\s*(name)?$/i.test(c.title.trim()))
    .map((c, i) => {
      const title = fixOCRTitle(String(c.title).trim());
      const { gpa, letter } = convertGrade(String(c.grade || ""), scale);
      return {
        code: `SUB${String(i+1).padStart(3,"0")}`,
        title,
        grade: String(c.grade || "").trim(),
        credits: parseFloat(c.credits) || 3,
        usCredits: parseFloat(c.credits) || 3,
        gradeScaleType: scale,
        convertedGPA: gpa,
        usGrade: letter,
      };
    })
    .filter((c, i, arr) =>
      arr.findIndex(x => x.title.toLowerCase() === c.title.toLowerCase()) === i
    );

  console.log(`→ [vision] extracted ${courses.length} courses`);
  return courses;
}

async function pdfToBase64Image(pdfPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vision-"));
  try {
    const result = spawnSync("pdftoppm", ["-png", "-r", "250", "-l", "1", pdfPath,
      path.join(tmpDir, "page")], { timeout: 60000 });
    if (result.error) throw new Error("pdftoppm failed: " + result.error.message);

    const pages = fs.readdirSync(tmpDir).filter(f => f.endsWith(".png")).sort();
    if (pages.length === 0) throw new Error("No pages extracted from PDF");

    const cleanPath = path.join(tmpDir, "clean.png");
    await sharp(path.join(tmpDir, pages[0]))
      .greyscale()
      .normalise()
      .threshold(180)
      .png()
      .toFile(cleanPath);

    return fs.readFileSync(cleanPath).toString("base64");
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function callOllamaVision(host, port, model, prompt, imageBase64) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model, prompt,
      images: [imageBase64],
      stream: false,
      options: { temperature: 0.0, num_predict: 4000 },
    });

    const req = http.request({
      hostname: host, port, path: "/api/generate", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(`Ollama error: ${parsed.error}`));
          resolve(parsed.response || "");
        } catch (e) { reject(new Error("Parse error: " + e.message)); }
      });
    });
    req.setTimeout(300000, () => { req.destroy(); reject(new Error("Vision timed out")); });
    req.on("error", e => reject(new Error(e.code === "ECONNREFUSED" ? "Ollama not running" : e.message)));
    req.write(body); req.end();
  });
}

function extractJSON(text) {
  try { return JSON.parse(text.trim()); } catch {}
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  const s = text.indexOf("["), e = text.lastIndexOf("]");
  if (s !== -1 && e > s) try { return JSON.parse(text.slice(s, e+1)); } catch {}
  return null;
}

module.exports = { parseWithVision };