const express = require("express");
const router = express.Router();
const fs = require("fs");

const { extractText } = require("../utils/ocrExtractor");
const { parseTranscriptText, detectUniversity, calculateStats } = require("../utils/transcriptParser");
const { parseWithAI } = require("../utils/aiParser");
const { processCoursesWithGPA } = require("../utils/gpaConverter");
const { parseCSV, parseExcel, parseTXT, tabulartoCourses } = require("../utils/fileParser");

router.post("/upload", async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { path: filePath, mimetype: fileType, originalname: originalName, size } = req.file;
    console.log(`\n📄 Upload: ${originalName} | ${fileType} | ${(size/1024).toFixed(1)}KB`);

    let courses = [];
    let university = "Unknown University";
    let extractedText = "";
    let parserUsed = "";

    // ── Step 1: Extract text ──────────────────────────────────
    if (fileType === "application/pdf" || fileType.includes("image")) {
      try {
        extractedText = await extractText(filePath, fileType);
        console.log(`→ OCR extracted ${extractedText.length} characters`);
      } catch (ocrErr) {
        cleanup(filePath);
        return res.status(500).json({ error: "OCR failed", message: ocrErr.message });
      }
    } else if (fileType === "text/plain") {
      extractedText = parseTXT(filePath);
    } else if (fileType === "text/csv" || fileType.includes("csv")) {
      const csvData = await parseCSV(filePath);
      courses = tabulartoCourses(csvData, university);
      parserUsed = "csv";
    } else if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("xlsx")) {
      const excelData = parseExcel(filePath);
      courses = tabulartoCourses(excelData, university);
      parserUsed = "excel";
    } else {
      cleanup(filePath);
      return res.status(400).json({ error: `Unsupported file type: ${fileType}` });
    }

    // ── Step 2: Parse courses from extracted text ─────────────
    if (extractedText) {
      university = detectUniversity(extractedText);
      console.log(`→ University: ${university}`);

      // Try AI parser first (Ollama — handles any format)
      try {
        const rawCourses = await parseWithAI(extractedText, university);
        courses = processCoursesWithGPA(rawCourses, university);
        parserUsed = "ai-ollama";
        console.log(`→ AI parsed ${courses.length} courses`);
      } catch (aiErr) {
        console.warn("⚠ Ollama unavailable, falling back to rule-based parser:", aiErr.message);
        courses = parseTranscriptText(extractedText, university);
        parserUsed = "rules";
        console.log(`→ Rule-based parsed ${courses.length} courses`);
      }
    }

    const stats = calculateStats(courses);
    cleanup(filePath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Done in ${elapsed}s | ${courses.length} courses | parser: ${parserUsed} | GPA: ${stats.weightedGPA}`);

    res.json({
      success: true,
      data: {
        fileName: originalName,
        university,
        courses,
        stats,
        parserUsed,
        extractedTextPreview: extractedText.substring(0, 500),
        processingTime: elapsed,
      },
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: "Processing failed", message: error.message });
  }
});

router.post("/parse-text", (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    const university = detectUniversity(text);
    const courses = parseTranscriptText(text, university);
    const stats = calculateStats(courses);
    res.json({ success: true, data: { university, courses, stats } });
  } catch (error) {
    res.status(500).json({ error: "Parsing failed", message: error.message });
  }
});

router.get("/health", (req, res) => {
  const deps = {};
  ["tesseract.js", "pdf-parse", "sharp", "papaparse", "xlsx"].forEach(dep => {
    try { require(dep); deps[dep] = "✓"; } catch { deps[dep] = "MISSING — run npm install"; }
  });
  const ollama = (() => {
    try {
      require("http").request({ hostname: "localhost", port: 11434, path: "/api/tags" }).end();
      return "running";
    } catch { return "not running"; }
  })();
  res.json({ status: "running", ollamaStatus: ollama, dependencies: deps });
});

function cleanup(fp) {
  try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
}

module.exports = router;