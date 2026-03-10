const fs = require("fs");
const path = require("path");

const PDF_PATH = process.argv[2];
const MODEL = process.env.OLLAMA_MODEL || "llama3.1";

async function main() {
  if (!PDF_PATH) {
    console.log("Usage: node test-ollama.js <path-to-pdf-or-txt>");
    process.exit(1);
  }
  if (!fs.existsSync(PDF_PATH)) { console.error("File not found:", PDF_PATH); process.exit(1); }

  console.log("─".repeat(55));
  console.log("📄 File :", path.basename(PDF_PATH));
  console.log("🤖 Model:", MODEL);
  console.log("─".repeat(55));

  // Step 1: Extract text
  console.log("\n[1/3] Extracting text...");
  const { extractText } = require("./utils/ocrExtractor");
  const ext = path.extname(PDF_PATH).toLowerCase();
  let rawText = "";
  if (ext === ".txt") {
    rawText = fs.readFileSync(PDF_PATH, "utf-8");
  } else {
    const mime = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
    rawText = await extractText(PDF_PATH, mime);
  }
  console.log(`      ${rawText.length} chars extracted`);
  console.log("\n--- TEXT PREVIEW ---");
  console.log(rawText.substring(0, 500));
  console.log("--- END ---\n");

  // Step 2: Parse with Ollama (returns fully converted courses)
  console.log("[2/3] Parsing with Ollama...");
  const { parseWithAI } = require("./utils/aiParser");
  const courses = await parseWithAI(rawText);

  // Step 3: Print WES report
  console.log("\n[3/3] WES Format Report:");
  const validCourses = courses.filter(c => c.convertedGPA > 0);
  const totalCredits = courses.reduce((s, c) => s + (c.usCredits || 3), 0);
  const cgpa = validCourses.length > 0
    ? validCourses.reduce((s, c) => s + c.convertedGPA * (c.usCredits || 3), 0) / validCourses.reduce((s, c) => s + (c.usCredits || 3), 0)
    : 0;

  const scaleType = courses[0]?.gradeScaleType || "unknown";

  console.log("═".repeat(78));
  console.log("  WES INTERNATIONAL CREDENTIAL EVALUATION — TRANSCRIPT REPORT");
  console.log(`  Grade Scale Detected: ${scaleType}`);
  console.log("═".repeat(78));
  console.log(`  ${"COURSE TITLE".padEnd(44)} ${"ORIG".padEnd(8)} ${"CR".padEnd(4)} ${"WES".padEnd(6)} GPA`);
  console.log("─".repeat(78));

  courses.forEach(c => {
    const title = (c.title || "Unknown").substring(0, 43).padEnd(44);
    const orig  = String(c.grade || "—").padEnd(8);
    const cr    = String(c.usCredits || 3).padEnd(4);
    const grade = String(c.usGrade || "N/A").padEnd(6);
    const gpa   = c.convertedGPA > 0 ? c.convertedGPA.toFixed(1) : "—";
    console.log(`  ${title} ${orig} ${cr} ${grade} ${gpa}`);
  });

  console.log("─".repeat(78));
  console.log(`  ${"CUMULATIVE GPA".padEnd(44)} ${"".padEnd(8)} ${String(totalCredits).padEnd(4)} ${"".padEnd(6)} ${cgpa.toFixed(2)}`);
  console.log(`  Total Courses: ${courses.length}  |  Total US Credits: ${totalCredits}`);
  console.log("═".repeat(78));
}

main().catch(e => { console.error("\n❌ Error:", e.message); process.exit(1); });