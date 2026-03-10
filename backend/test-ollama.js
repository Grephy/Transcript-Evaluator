const fs = require("fs");
const path = require("path");

const PDF_PATH = process.argv[2];
const MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "llava";
const USE_VISION = process.argv.includes("--vision") || process.env.USE_VISION === "1";

async function main() {
  if (!PDF_PATH) {
    console.log("Usage: node test-ollama.js <path-to-pdf> [--vision]");
    console.log("  --vision  Use llava vision model (better for watermarked PDFs)");
    process.exit(1);
  }
  if (!fs.existsSync(PDF_PATH)) { console.error("File not found:", PDF_PATH); process.exit(1); }

  const ext = path.extname(PDF_PATH).toLowerCase();
  console.log("─".repeat(55));
  console.log("📄 File   :", path.basename(PDF_PATH));
  console.log("🤖 Mode   :", USE_VISION ? `Vision (${VISION_MODEL})` : `Text OCR → ${MODEL}`);
  console.log("─".repeat(55));

  const { detectUniversity } = require("./utils/transcriptParser");
  const { detectGradeScale } = require("./utils/aiParser");
  const { processCoursesWithGPA, calculateWeightedGPA } = require("./utils/gpaConverter");

  let courses = [];

  if (USE_VISION) {
    // ── Vision path: image → llava ────────────────────────
    console.log("\n[1/2] Parsing with vision model...");
    const { parseWithVision } = require("./utils/visionParser");

    // Need university for grade scale — quick text extract for detection only
    let university = "Unknown University";
    try {
      const { extractText } = require("./utils/ocrExtractor");
      const quickText = await extractText(PDF_PATH, "application/pdf");
      university = detectUniversity(quickText);
    } catch {}

    const gradeScale = detectGradeScale(university, "");
    console.log(`      University  : ${university}`);
    console.log(`      Grade Scale : ${gradeScale.type}`);

    const raw = await parseWithVision(PDF_PATH, university, gradeScale);
    courses = processCoursesWithGPA(raw, university);
    console.log(`      Extracted ${courses.length} courses`);

  } else {
    // ── Text OCR path: pdf → tesseract → llama ────────────
    console.log("\n[1/4] Extracting text...");
    let rawText = "";
    if (ext === ".txt") {
      rawText = fs.readFileSync(PDF_PATH, "utf-8");
    } else {
      const { extractText } = require("./utils/ocrExtractor");
      const mime = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
      rawText = await extractText(PDF_PATH, mime);
    }
    console.log(`      Extracted ${rawText.length} chars`);
    console.log("\n--- RAW TEXT PREVIEW (first 600 chars) ---");
    console.log(rawText.substring(0, 600));
    console.log("--- END ---\n");

    const university = detectUniversity(rawText);
    const gradeScale = detectGradeScale(university, rawText);
    const { cleanOCRText, parseWithAI } = require("./utils/aiParser");
    const cleanText = cleanOCRText(rawText);

    console.log(`[2/4] University  : ${university}`);
    console.log(`      Grade Scale : ${gradeScale.type}`);
    console.log(`      Raw chars   : ${rawText.length}  →  Cleaned: ${cleanText.length}`);
    console.log(`\n--- CLEANED TEXT SENT TO OLLAMA ---`);
    console.log(cleanText.substring(0, 800));
    console.log("--- END ---\n");

    console.log("[3/4] Sending to Ollama...");
    const raw = await parseWithAI(rawText, university);
    courses = processCoursesWithGPA(raw, university);
    console.log(`      Extracted ${courses.length} courses`);
  }

  // ── Print WES Report ──────────────────────────────────
  const stepLabel = USE_VISION ? "[2/2]" : "[4/4]";
  console.log(`\n${stepLabel} WES Format Report:`);

  const totalCredits = courses.reduce((s, c) => s + (c.usCredits || 3), 0);
  const cgpa = calculateWeightedGPA(courses);

  console.log("═".repeat(78));
  console.log("  WES INTERNATIONAL CREDENTIAL EVALUATION — TRANSCRIPT REPORT");
  console.log("═".repeat(78));
  console.log(`  ${"COURSE TITLE".padEnd(44)} ${"ORIG".padEnd(6)} ${"US CR".padEnd(6)} ${"WES".padEnd(6)} GPA`);
  console.log("─".repeat(78));
  courses.forEach(c => {
    const title = (c.title || "Unknown").substring(0, 43).padEnd(44);
    const orig  = String(c.grade || "—").padEnd(6);
    const cr    = String(c.usCredits || 3).padEnd(6);
    const grade = String(c.usGrade || "N/A").padEnd(6);
    const gpa   = (c.convertedGPA ?? 0).toFixed(1);
    console.log(`  ${title} ${orig} ${cr} ${grade} ${gpa}`);
  });
  console.log("─".repeat(78));
  console.log(`  ${"CUMULATIVE GPA".padEnd(44)} ${"".padEnd(6)} ${String(totalCredits).padEnd(6)} ${"".padEnd(6)} ${cgpa.toFixed(2)}`);
  console.log(`  Total Courses: ${courses.length}  |  Total US Credit Hours: ${totalCredits}`);
  console.log("═".repeat(78));
}

main().catch(e => { console.error("\n❌ Error:", e.message); process.exit(1); });