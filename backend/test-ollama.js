const fs   = require("fs");
const path = require("path");

const PDF_PATH = process.argv[2];
const MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "llava";
const MODE = process.env.MODE || "text"; // "text" | "vision" | "dual"

async function main() {
  if (!PDF_PATH) {
    console.log("Usage: node test-ollama.js <path-to-pdf>");
    console.log("  MODE=text   node test-ollama.js file.pdf   # text only");
    console.log("  MODE=vision node test-ollama.js file.pdf   # vision only");
    console.log("  MODE=dual   node test-ollama.js file.pdf   # both + merge (default)");
    process.exit(1);
  }
  if (!fs.existsSync(PDF_PATH)) { console.error("File not found:", PDF_PATH); process.exit(1); }

  console.log("─".repeat(55));
  console.log("📄 File :", path.basename(PDF_PATH));
  console.log("🤖 Mode :", MODE === "dual" ? `dual (${MODEL} + ${VISION_MODEL})` : `${MODE} (${MODE === "vision" ? VISION_MODEL : MODEL})`);
  console.log("─".repeat(55));

  const { extractText } = require("./utils/ocrExtractor");
  const { parseWithAI }  = require("./utils/aiParser");

  // ── Step 1: Extract text ───────────────────────────────────
  console.log("\n[1] Extracting text...");
  const ext = path.extname(PDF_PATH).toLowerCase();
  const mime = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
  const rawText = ext === ".txt" ? fs.readFileSync(PDF_PATH, "utf-8") : await extractText(PDF_PATH, mime);
  console.log(`    ${rawText.length} chars extracted`);

  let textCourses = null;
  let visionCourses = null;

  // ── Step 2a: Text path ─────────────────────────────────────
  if (MODE === "text" || MODE === "dual") {
    console.log("\n[2a] Text path (pdfplumber → llama3.1)...");
    try {
      textCourses = await parseWithAI(rawText);
      console.log(`     ✓ ${textCourses.length} courses`);
    } catch (e) {
      console.log(`     ✗ Failed: ${e.message}`);
    }
  }

  // ── Step 2b: Vision path ───────────────────────────────────
  if ((MODE === "vision" || MODE === "dual") && ext === ".pdf") {
    console.log("\n[2b] Vision path (image → llava)...");
    try {
      const { parseWithVision } = require("./utils/visionParser");
      visionCourses = await parseWithVision(PDF_PATH, rawText);
      console.log(`     ✓ ${visionCourses.length} courses`);
    } catch (e) {
      console.log(`     ✗ Failed: ${e.message}`);
      if (e.message.includes("no courses")) {
        console.log(`     → Try: ollama pull llava:13b  then  OLLAMA_VISION_MODEL=llava:13b node test-ollama.js ...`);
      }
    }
  }

  // ── Step 3: Merge or pick ──────────────────────────────────
  let finalCourses;
  let source;

  if (textCourses && visionCourses) {
    console.log("\n[3] Merging text + vision results...");
    const { mergeParsedResults } = require("./utils/resultMerger");
    const result = mergeParsedResults(textCourses, visionCourses);
    finalCourses = result.courses;
    source = result.source;
    console.log(`    Source: ${source}`);
    console.log(`    Text: ${textCourses.length} courses | Vision: ${visionCourses.length} courses | Merged: ${finalCourses.length} courses`);
  } else {
    finalCourses = textCourses || visionCourses || [];
    source = textCourses ? "text only" : "vision only";
  }

  // ── Step 4: Print WES report ───────────────────────────────
  console.log("\n[4] WES Format Report:");
  const scale = finalCourses[0]?.gradeScaleType || "unknown";
  const validC = finalCourses.filter(c => c.convertedGPA > 0);
  const totalCr = finalCourses.reduce((s, c) => s + (c.usCredits || 3), 0);
  const cgpa = validC.length > 0
    ? validC.reduce((s, c) => s + c.convertedGPA * (c.usCredits || 3), 0)
      / validC.reduce((s, c) => s + (c.usCredits || 3), 0)
    : 0;

  console.log("═".repeat(78));
  console.log("  WES INTERNATIONAL CREDENTIAL EVALUATION — TRANSCRIPT REPORT");
  console.log(`  Grade Scale: ${scale}  |  Source: ${source}`);
  console.log("═".repeat(78));
  console.log(`  ${"COURSE TITLE".padEnd(44)} ${"ORIG".padEnd(6)} ${"CR".padEnd(4)} ${"WES".padEnd(6)} GPA`);
  console.log("─".repeat(78));

  finalCourses.forEach(c => {
    const title = (c.title || "").substring(0, 43).padEnd(44);
    const orig  = String(c.grade || "—").padEnd(6);
    const cr    = String(c.usCredits || 3).padEnd(4);
    const grade = String(c.usGrade || "N/A").padEnd(6);
    const gpa   = c.convertedGPA > 0 ? c.convertedGPA.toFixed(1) : "—";
    console.log(`  ${title} ${orig} ${cr} ${grade} ${gpa}`);
  });

  console.log("─".repeat(78));
  console.log(`  ${"CUMULATIVE GPA".padEnd(44)} ${"".padEnd(6)} ${String(totalCr).padEnd(4)} ${"".padEnd(6)} ${cgpa.toFixed(2)}`);
  console.log(`  Total Courses: ${finalCourses.length}  |  Total Credits: ${totalCr}`);
  console.log("═".repeat(78));
}

main().catch(e => { console.error("\n❌ Error:", e.message); process.exit(1); });