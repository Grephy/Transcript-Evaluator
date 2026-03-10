const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");
const sharp = require("sharp");

/**
 * Parse transcript by sending the image directly to a vision model (llava).
 * This bypasses Tesseract OCR entirely — the model reads the image like a human.
 * 
 * Requirements: ollama pull llava  (or llava:13b for better accuracy)
 */
async function parseWithVision(pdfPath, university, gradeScale) {
  const model = process.env.OLLAMA_VISION_MODEL || "llava";
  const host  = process.env.OLLAMA_HOST || "localhost";
  const port  = parseInt(process.env.OLLAMA_PORT || "11434");

  // Convert PDF page 1 to a clean thresholded image
  const imageBase64 = await pdfToBase64Image(pdfPath);

  const prompt = `Look at this transcript image carefully.

Find the table with columns: Subject Name | Credit | Grade

Read EVERY row in the table. For each subject row return a JSON object.

Return ONLY this JSON array with no other text:
[{"code":"SUB001","title":"EXACT subject name from image","grade":"EXACT grade letter from Grade column","credits":3},...]

Grading scale: ${gradeScale.note}

Important:
- Read the Grade column carefully - grades are single letters like A, B+, C, D
- Do NOT guess or make up subjects - only include what you can see in the image
- There are approximately 30-35 subjects in this transcript
- The table has two halves side by side (left and right columns)
- Read BOTH the left side subjects AND the right side subjects

JSON array:`;

  console.log(`→ Sending image to vision model (${model})...`);

  const responseText = await callOllamaVision(host, port, model, prompt, imageBase64);
  console.log("→ Vision response (first 300 chars):", responseText.substring(0, 300));

  const courses = extractJSON(responseText);
  if (!courses) {
    console.error("→ Full vision response:", responseText.substring(0, 1000));
    throw new Error(`Could not parse JSON from vision model response. Try: ollama pull llava:13b`);
  }
  if (courses.length === 0) {
    throw new Error(`Vision model returned empty course list.`);
  }

  return courses
    .filter(c => c.title && c.title.length > 4)
    .map((c, i) => ({
      code: c.code || `SUB${String(i+1).padStart(3,"0")}`,
      title: String(c.title).trim(),
      grade: String(c.grade || "").trim(),
      credits: parseFloat(c.credits) || 3,
      gradeScaleType: gradeScale.type,
    }))
    .filter((c, i, arr) => arr.findIndex(x => x.title.toLowerCase() === c.title.toLowerCase()) === i);
}

async function pdfToBase64Image(pdfPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vision-"));
  const prefix = path.join(tmpDir, "page");

  try {
    // Convert first page only at 300 DPI
    const result = spawnSync("pdftoppm", ["-png", "-r", "300", "-l", "1", pdfPath, prefix], { timeout: 60000 });
    if (result.error) throw new Error("pdftoppm failed: " + result.error.message);

    const pages = fs.readdirSync(tmpDir).filter(f => f.endsWith(".png")).sort();
    if (pages.length === 0) throw new Error("No pages extracted");

    const pagePath = path.join(tmpDir, pages[0]);

    // Apply threshold to kill watermark — same as ocrExtractor
    const cleanPath = path.join(tmpDir, "clean.png");
    await sharp(pagePath)
      .greyscale()
      .normalise()
      .threshold(180)
      .png()
      .toFile(cleanPath);

    // Convert to base64
    const imageBuffer = fs.readFileSync(cleanPath);
    return imageBuffer.toString("base64");

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function callOllamaVision(host, port, model, prompt, imageBase64) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      prompt,
      images: [imageBase64],  // Ollama vision API accepts base64 images array
      stream: false,
      options: { temperature: 0.0, num_predict: 4000 },
    });

    const req = http.request({
      hostname: host, port,
      path: "/api/generate", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(`Ollama vision error: ${parsed.error}`));
          resolve(parsed.response || "");
        } catch (e) {
          reject(new Error("Failed to parse vision response: " + e.message));
        }
      });
    });

    req.setTimeout(300000, () => { req.destroy(); reject(new Error("Vision model timed out")); });
    req.on("error", e => reject(new Error(e.code === "ECONNREFUSED" ? "Ollama not running" : e.message)));
    req.write(body);
    req.end();
  });
}

function extractJSON(text) {
  // Try direct parse
  try { return JSON.parse(text.trim()); } catch {}
  // Strip ```json fences (LLaVA often adds these)
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  // Find array boundaries
  const s = text.indexOf("["), e = text.lastIndexOf("]");
  if (s !== -1 && e > s) try { return JSON.parse(text.slice(s, e+1)); } catch {}
  // Find object boundaries (single object response)
  const os = text.indexOf("{"), oe = text.lastIndexOf("}");
  if (os !== -1 && oe > os) {
    try { return [JSON.parse(text.slice(os, oe+1))]; } catch {}
  }
  return null;
}

module.exports = { parseWithVision };