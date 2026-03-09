const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const { extractText } = require("../utils/ocrExtractor");
const { parseTranscriptText, detectUniversity, calculateStats } = require("../utils/transcriptParser");
const { parseCSV, parseExcel, parseTXT, tabulartoCourses } = require("../utils/fileParser");

router.post("/upload", async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { path: filePath, mimetype: fileType, originalname: originalName, size } = req.file;
    console.log(`\n📄 Upload: ${originalName} | ${fileType} | ${(size/1024).toFixed(1)}KB`);

    let courses = [];
    let university = "Unknown University";
    let extractedText = "";
    let extractionMethod = "";

    if (fileType === "application/pdf" || fileType.includes("image")) {
      console.log("→ Running OCR extraction...");
      try {
        extractedText = await extractText(filePath, fileType);
        extractionMethod = "ocr";
        console.log(`→ Extracted ${extractedText.length} characters`);
      } catch (ocrErr) {
        console.error("OCR failed:", ocrErr.message);
        cleanup(filePath);
        return res.status(500).json({
          error: "OCR extraction failed",
          message: ocrErr.message,
          hint: "Make sure tesseract.js, sharp, and pdf-parse are installed (npm install)"
        });
      }

    } else if (fileType === "text/plain") {
      extractedText = parseTXT(filePath);
      extractionMethod = "text";

    } else if (fileType === "text/csv" || fileType.includes("csv")) {
      const csvData = await parseCSV(filePath);
      courses = tabulartoCourses(csvData, university);
      extractionMethod = "csv";

    } else if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("xlsx")) {
      const excelData = parseExcel(filePath);
      courses = tabulartoCourses(excelData, university);
      extractionMethod = "excel";

    } else {
      cleanup(filePath);
      return res.status(400).json({ error: `Unsupported file type: ${fileType}` });
    }

    // For text-based extractions, detect university and parse courses
    if (extractionMethod === "ocr" || extractionMethod === "text") {
      university = detectUniversity(extractedText);
      console.log(`→ Detected university: ${university}`);
      courses = parseTranscriptText(extractedText, university);
      console.log(`→ Parsed ${courses.length} courses`);

      if (courses.length === 0) {
        console.warn("⚠ No courses parsed. Text preview:\n", extractedText.substring(0, 400));
      }
    }

    const stats = calculateStats(courses);
    cleanup(filePath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Done in ${elapsed}s — ${courses.length} courses, GPA: ${stats.weightedGPA}`);

    res.json({
      success: true,
      data: {
        fileName: originalName,
        university,
        courses,
        stats,
        extractionMethod,
        extractedTextPreview: extractedText,  // full text for debugging
        processingTime: elapsed,
      },
    });

  } catch (error) {
    console.error("❌ Upload error:", error);
    if (req.file) cleanup(req.file.path);

    res.status(500).json({
      error: "File processing failed",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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
    console.error("Text parsing error:", error);
    res.status(500).json({ error: "Text parsing failed", message: error.message });
  }
});

router.get("/health", (req, res) => {
  // Check if key dependencies are loadable
  const deps = {};
  ["tesseract.js", "pdf-parse", "sharp", "papaparse", "xlsx"].forEach(dep => {
    try { require(dep); deps[dep] = "ok"; } catch (e) { deps[dep] = "MISSING - run npm install"; }
  });
  const pdftoppm = (() => { try { require("child_process").execSync("pdftoppm -h 2>&1"); return "ok"; } catch { return "not found"; } })();

  res.json({
    status: "running",
    timestamp: new Date(),
    dependencies: deps,
    pdftoppm,
  });
});

function cleanup(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
}

module.exports = router;
// const express = require("express");
// const router = express.Router();
// const fs = require("fs");
// const path = require("path");

// const { extractText } = require("../utils/ocrExtractor");
// const { parseTranscriptText, detectUniversity, calculateStats } = require("../utils/transcriptParser");
// const { parseCSV, parseExcel, parseTXT, tabulartoCourses } = require("../utils/fileParser");

// /**
//  * POST /api/upload
//  * Upload and process a transcript file
//  */
// router.post("/upload", async (req, res) => {
//   try {
//     console.log("Upload request received");
//     console.log("req.file:", req.file ? {
//       originalname: req.file.originalname,
//       mimetype: req.file.mimetype,
//       size: req.file.size,
//       path: req.file.path
//     } : "No file");

//     if (!req.file) {
//       console.log("No file in request");
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     const file = req.file;
//     const filePath = file.path;
//     const fileType = file.mimetype;
//     const originalName = file.originalname;

//     console.log(`Processing file: ${originalName} (${fileType})`);

//     let courses = [];
//     let university = "Unknown University";
//     let extractedText = "";

//     // Handle different file types
//     if (fileType === "application/pdf" || fileType.includes("image")) {
//       // OCR extraction for PDF and images
//       console.log("Using OCR extraction...");
//       extractedText = await extractText(filePath, fileType);
//       courses = parseTranscriptText(extractedText, university);
//     } else if (fileType === "text/plain") {
//       // Plain text file
//       console.log("Parsing plain text...");
//       extractedText = parseTXT(filePath);
//       courses = parseTranscriptText(extractedText, university);
//     } else if (fileType === "text/csv" || fileType.includes("spreadsheet")) {
//       // CSV file
//       console.log("Parsing CSV...");
//       const csvData = await parseCSV(filePath);
//       courses = tabulartoCourses(csvData, university);
//     } else if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("xlsx")) {
//       // Excel file
//       console.log("Parsing Excel...");
//       const excelData = parseExcel(filePath);
//       courses = tabulartoCourses(excelData, university);
//     } else {
//       return res.status(400).json({ error: `Unsupported file type: ${fileType}` });
//     }

//     // Calculate statistics
//     const stats = calculateStats(courses);

//     // Clean up uploaded file
//     fs.unlinkSync(filePath);

//     // Return extracted data
//     res.json({
//       success: true,
//       data: {
//         fileName: originalName,
//         university,
//         courses,
//         stats,
//         extractedText: extractedText.substring(0, 500), // Preview of extracted text
//       },
//     });
//   } catch (error) {
//     console.error("Upload processing error:", error);
    
//     // Clean up file on error
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }

//     res.status(500).json({
//       error: "File processing failed",
//       message: error.message,
//     });
//   }
// });

// /**
//  * POST /api/parse-text
//  * Parse raw transcript text
//  */
// router.post("/parse-text", (req, res) => {
//   try {
//     const { text } = req.body;

//     if (!text) {
//       return res.status(400).json({ error: "No text provided" });
//     }

//     const courses = parseTranscriptText(text);
//     const university = detectUniversity(text);
//     const stats = calculateStats(courses);

//     res.json({
//       success: true,
//       data: {
//         university,
//         courses,
//         stats,
//       },
//     });
//   } catch (error) {
//     console.error("Text parsing error:", error);
//     res.status(500).json({
//       error: "Text parsing failed",
//       message: error.message,
//     });
//   }
// });

// /**
//  * GET /api/health
//  * Health check endpoint
//  */
// router.get("/health", (req, res) => {
//   res.json({ status: "Backend API is running", timestamp: new Date() });
// });

// module.exports = router;
