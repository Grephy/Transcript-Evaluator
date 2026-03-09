const http = require("http");
const fs = require("fs");
const path = require("path");

// ── Config ─────────────────────────────────────────
const OLLAMA_HOST = "localhost";
const OLLAMA_PORT = 11434;
const MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const PDF_PATH = process.argv[2]; // pass PDF as argument

// ── Main ───────────────────────────────────────────
async function main() {
  if (!PDF_PATH) {
    console.log("Usage: node test-ollama.js <path-to-pdf>");
    console.log("Example: node test-ollama.js ~/Desktop/transcript.pdf");
    process.exit(1);
  }

  if (!fs.existsSync(PDF_PATH)) {
    console.error("File not found:", PDF_PATH);
    process.exit(1);
  }

  console.log("─".repeat(50));
  console.log("📄 PDF:", path.basename(PDF_PATH));
  console.log("🤖 Model:", MODEL);
  console.log("─".repeat(50));

  // Step 1: Extract text from PDF
  console.log("\n[1/3] Extracting text from PDF...");
  const rawText = await extractPDF(PDF_PATH);
  console.log(`      Got ${rawText.length} characters`);
  console.log("\n--- RAW OCR TEXT (first 500 chars) ---");
  console.log(rawText);
  console.log("--- END ---\n");

  // Step 2: Send to Ollama
  console.log("[2/3] Sending to Ollama...");
  const courses = await parseWithOllama(rawText);
  console.log(`      Extracted ${courses.length} courses\n`);

  // Step 3: Print WES-format report
  console.log("[3/3] WES Format Report:");
  printWESReport(courses);
}

// ── OCR ────────────────────────────────────────────
async function extractPDF(pdfPath) {
  // Use the project's ocrExtractor (has noise cleaning + 400 DPI)
  const { extractText } = require("./utils/ocrExtractor");
  return await extractText(pdfPath, "application/pdf");
}

// ── Ollama ─────────────────────────────────────────
async function parseWithOllama(rawText) {
  const prompt = `You are a transcript parser for Indian university transcripts.

Extract every subject/course from the OCR text below.
Return ONLY a valid JSON array. No explanation. No markdown. No backticks.

Each object:
- "code": course code if visible, else "SUB001", "SUB002" etc
- "title": subject name (clean OCR noise)  
- "grade": marks as string e.g. "72" or "B+" 
- "credits": number, default 3

Ignore: student name, enrollment no, totals, SGPA, CGPA, headers.

TRANSCRIPT:
${rawText}

JSON:`;

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.0, num_predict: 4000 },
    });

    const req = http.request({
      hostname: OLLAMA_HOST, port: OLLAMA_PORT,
      path: "/api/generate", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error));
          const text = parsed.response || "";
          console.log("\n--- OLLAMA RAW RESPONSE ---");
          console.log(text.substring(0, 600));
          console.log("--- END ---\n");
          const courses = extractJSON(text);
          resolve(courses || []);
        } catch (e) { reject(e); }
      });
    });

    req.setTimeout(180000, () => { req.destroy(); reject(new Error("Timeout — try llama3.2 for faster results")); });
    req.on("error", e => reject(new Error(e.code === "ECONNREFUSED" ? "Ollama not running. Run: ollama serve" : e.message)));
    req.write(body);
    req.end();
  });
}

function extractJSON(text) {
  try { return JSON.parse(text.trim()); } catch {}
  const m = text.match(/\[[\s\S]*\]/);
  if (m) try { return JSON.parse(m[0]); } catch {}
  const stripped = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  const s = text.indexOf("["), e = text.lastIndexOf("]");
  if (s !== -1 && e > s) try { return JSON.parse(text.slice(s, e+1)); } catch {}
  return null;
}

// ── WES Report Printer ─────────────────────────────
function printWESReport(courses) {
  if (courses.length === 0) {
    console.log("❌ No courses found. See raw OCR and Ollama output above.");
    return;
  }

  // Letter grade → 4.0 GPA (handles A, B+, C, D, E etc.)
  const LETTER_MAP = {
    "A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,
    "C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"D-":0.7,"F":0.0,"E":0.0
  };
  const LETTER_DISPLAY = {
    "A+":"A","A":"A","A-":"A-","B+":"B+","B":"B","B-":"B-",
    "C+":"C+","C":"C","C-":"C-","D+":"D+","D":"D","D-":"D-","F":"F","E":"F"
  };
  const PCT_TABLE = [
    {min:90,max:100,gpa:4.0,letter:"A"},{min:85,max:89,gpa:3.7,letter:"A-"},
    {min:80,max:84,gpa:3.3,letter:"B+"},{min:75,max:79,gpa:3.0,letter:"B"},
    {min:70,max:74,gpa:2.7,letter:"B-"},{min:65,max:69,gpa:2.3,letter:"C+"},
    {min:60,max:64,gpa:2.0,letter:"C"},{min:55,max:59,gpa:1.7,letter:"C-"},
    {min:50,max:54,gpa:1.3,letter:"D+"},{min:45,max:49,gpa:1.0,letter:"D"},
    {min:0,max:44,gpa:0.0,letter:"F"}
  ];

  function toGPA(grade) {
    const s = String(grade).trim().toUpperCase().replace("%","");
    // Letter grade
    if (/^[A-F][+-]?$/.test(s) || s === "E") {
      return { gpa: LETTER_MAP[s]??0.0, letter: LETTER_DISPLAY[s]??"F" };
    }
    const n = parseFloat(s);
    if (isNaN(n)) return { gpa: 0, letter: "N/A" };
    // Percentage
    for (const row of PCT_TABLE) {
      if (n >= row.min && n <= row.max) return { gpa: row.gpa, letter: row.letter };
    }
    return { gpa: 0, letter: "F" };
  }

  const converted = courses.map(c => ({ ...c, ...toGPA(c.grade) }));
  const totalCredits = converted.reduce((s, c) => s + (c.credits || 3), 0);
  const cgpa = converted.reduce((s, c) => s + (c.gpa * (c.credits||3)), 0) / totalCredits;

  console.log("═".repeat(75));
  console.log("  WES INTERNATIONAL CREDENTIAL EVALUATION — TRANSCRIPT REPORT");
  console.log("═".repeat(75));
  console.log(`  ${"COURSE TITLE".padEnd(42)} ${"ORIG".padEnd(6)} ${"US CR".padEnd(6)} ${"GRADE".padEnd(6)} GPA`);
  console.log("─".repeat(75));
  converted.forEach(c => {
    console.log(
      `  ${c.title.substring(0,41).padEnd(42)} ${String(c.grade).padEnd(6)} ${String(c.credits||3).padEnd(6)} ${c.letter.padEnd(6)} ${c.gpa.toFixed(1)}`
    );
  });
  console.log("─".repeat(75));
  console.log(`  ${"CUMULATIVE GPA".padEnd(42)} ${"".padEnd(6)} ${String(totalCredits).padEnd(6)} ${"".padEnd(6)} ${cgpa.toFixed(2)}`);
  console.log(`  Total Courses: ${converted.length}  |  Total US Credit Hours: ${totalCredits}`);
  console.log("═".repeat(75));
}

main().catch(e => { console.error("\n❌ Error:", e.message); process.exit(1); });
// const http = require("http");
// const fs = require("fs");
// const path = require("path");
// const { execSync, spawnSync } = require("child_process");
// const os = require("os");

// // ── Config ─────────────────────────────────────────
// const OLLAMA_HOST = "localhost";
// const OLLAMA_PORT = 11434;
// const MODEL = process.env.OLLAMA_MODEL || "llama3.1";
// const PDF_PATH = process.argv[2]; // pass PDF as argument

// // ── Main ───────────────────────────────────────────
// async function main() {
//   if (!PDF_PATH) {
//     console.log("Usage: node test-ollama.js <path-to-pdf>");
//     console.log("Example: node test-ollama.js ~/Desktop/transcript.pdf");
//     process.exit(1);
//   }

//   if (!fs.existsSync(PDF_PATH)) {
//     console.error("File not found:", PDF_PATH);
//     process.exit(1);
//   }

//   console.log("─".repeat(50));
//   console.log("📄 PDF:", path.basename(PDF_PATH));
//   console.log("🤖 Model:", MODEL);
//   console.log("─".repeat(50));

//   // Step 1: Extract text from PDF
//   console.log("\n[1/3] Extracting text from PDF...");
//   const rawText = await extractPDF(PDF_PATH);
//   console.log(`      Got ${rawText.length} characters`);
//   console.log("\n--- RAW OCR TEXT (first 500 chars) ---");
//   console.log(rawText.substring(0, 500));
//   console.log("--- END ---\n");

//   // Step 2: Send to Ollama
//   console.log("[2/3] Sending to Ollama...");
//   const courses = await parseWithOllama(rawText);
//   console.log(`      Extracted ${courses.length} courses\n`);

//   // Step 3: Print WES-format report
//   console.log("[3/3] WES Format Report:");
//   printWESReport(courses);
// }

// // ── OCR ────────────────────────────────────────────
// async function extractPDF(pdfPath) {
//   // Try pdf text extraction first
//   try {
//     const pdfParse = require("pdf-parse");
//     const buffer = fs.readFileSync(pdfPath);
//     const data = await pdfParse(buffer);
//     if (data.text.trim().length > 100) return data.text;
//   } catch (e) {
//     console.log("      pdf-parse unavailable, using OCR...");
//   }

//   // Fall back to pdftoppm + tesseract
//   const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wes-test-"));
//   const prefix = path.join(tmpDir, "page");

//   try {
//     const result = spawnSync("pdftoppm", ["-png", "-r", "300", pdfPath, prefix], { timeout: 60000 });
//     if (result.error) throw new Error("pdftoppm failed: " + result.error.message);

//     const pages = fs.readdirSync(tmpDir).filter(f => f.endsWith(".png")).sort();
//     if (pages.length === 0) throw new Error("No pages extracted");

//     const Tesseract = require("tesseract.js");

//     let fullText = "";
//     for (const page of pages) {
//       const { data: { text } } = await Tesseract.recognize(path.join(tmpDir, page), "eng", {
//         logger: m => m.status === "recognizing text" && process.stdout.write(`\r      OCR: ${(m.progress*100).toFixed(0)}%`)
//       });
//       process.stdout.write("\n");
//       fullText += text + "\n\n";
//     }
//     return fullText;
//   } finally {
//     fs.rmSync(tmpDir, { recursive: true, force: true });
//   }
// }

// // ── Ollama ─────────────────────────────────────────
// async function parseWithOllama(rawText) {
//   const prompt = `You are a transcript parser for Indian university transcripts.

// Extract every subject/course from the OCR text below.
// Return ONLY a valid JSON array. No explanation. No markdown. No backticks.

// Each object:
// - "code": course code if visible, else "SUB001", "SUB002" etc
// - "title": subject name (clean OCR noise)  
// - "grade": marks as string e.g. "72" or "B+" 
// - "credits": number, default 3

// Ignore: student name, enrollment no, totals, SGPA, CGPA, headers.

// TRANSCRIPT:
// ${rawText}

// JSON:`;

//   return new Promise((resolve, reject) => {
//     const body = JSON.stringify({
//       model: MODEL,
//       prompt,
//       stream: false,
//       options: { temperature: 0.1, num_predict: 2000 },
//     });

//     const req = http.request({
//       hostname: OLLAMA_HOST, port: OLLAMA_PORT,
//       path: "/api/generate", method: "POST",
//       headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
//     }, (res) => {
//       let data = "";
//       res.on("data", c => data += c);
//       res.on("end", () => {
//         try {
//           const parsed = JSON.parse(data);
//           if (parsed.error) return reject(new Error(parsed.error));
//           const text = parsed.response || "";
//           console.log("\n--- OLLAMA RAW RESPONSE ---");
//           console.log(text.substring(0, 600));
//           console.log("--- END ---\n");
//           const courses = extractJSON(text);
//           resolve(courses || []);
//         } catch (e) { reject(e); }
//       });
//     });

//     req.setTimeout(180000, () => { req.destroy(); reject(new Error("Timeout — try llama3.2 for faster results")); });
//     req.on("error", e => reject(new Error(e.code === "ECONNREFUSED" ? "Ollama not running. Run: ollama serve" : e.message)));
//     req.write(body);
//     req.end();
//   });
// }

// function extractJSON(text) {
//   try { return JSON.parse(text.trim()); } catch {}
//   const m = text.match(/\[[\s\S]*\]/);
//   if (m) try { return JSON.parse(m[0]); } catch {}
//   const stripped = text.replace(/```json|```/g, "").trim();
//   try { return JSON.parse(stripped); } catch {}
//   const s = text.indexOf("["), e = text.lastIndexOf("]");
//   if (s !== -1 && e > s) try { return JSON.parse(text.slice(s, e+1)); } catch {}
//   return null;
// }

// // ── WES Report Printer ─────────────────────────────
// function printWESReport(courses) {
//   if (courses.length === 0) {
//     console.log("❌ No courses found. See raw OCR and Ollama output above.");
//     return;
//   }

//   const WES_TABLE = {
//     "90-100": { gpa: 4.0, letter: "A"  },
//     "85-89":  { gpa: 3.7, letter: "A-" },
//     "80-84":  { gpa: 3.3, letter: "B+" },
//     "75-79":  { gpa: 3.0, letter: "B"  },
//     "70-74":  { gpa: 2.7, letter: "B-" },
//     "65-69":  { gpa: 2.3, letter: "C+" },
//     "60-64":  { gpa: 2.0, letter: "C"  },
//     "55-59":  { gpa: 1.7, letter: "C-" },
//     "50-54":  { gpa: 1.3, letter: "D+" },
//     "45-49":  { gpa: 1.0, letter: "D"  },
//     "0-44":   { gpa: 0.0, letter: "F"  },
//   };

//   function toGPA(grade) {
//     const n = parseFloat(String(grade).replace("%",""));
//     if (isNaN(n)) return { gpa: 0, letter: "N/A" };
//     for (const [range, val] of Object.entries(WES_TABLE)) {
//       const [min, max] = range.split("-").map(Number);
//       if (n >= min && n <= max) return val;
//     }
//     return { gpa: 0, letter: "F" };
//   }

//   const converted = courses.map(c => ({ ...c, ...toGPA(c.grade) }));
//   const totalCredits = converted.reduce((s, c) => s + (c.credits || 3), 0);
//   const cgpa = converted.reduce((s, c) => s + (c.gpa * (c.credits||3)), 0) / totalCredits;

//   console.log("═".repeat(75));
//   console.log("  WES INTERNATIONAL CREDENTIAL EVALUATION — TRANSCRIPT REPORT");
//   console.log("═".repeat(75));
//   console.log(`  ${"COURSE TITLE".padEnd(42)} ${"ORIG".padEnd(6)} ${"US CR".padEnd(6)} ${"GRADE".padEnd(6)} GPA`);
//   console.log("─".repeat(75));
//   converted.forEach(c => {
//     console.log(
//       `  ${c.title.substring(0,41).padEnd(42)} ${String(c.grade).padEnd(6)} ${String(c.credits||3).padEnd(6)} ${c.letter.padEnd(6)} ${c.gpa.toFixed(1)}`
//     );
//   });
//   console.log("─".repeat(75));
//   console.log(`  ${"CUMULATIVE GPA".padEnd(42)} ${"".padEnd(6)} ${String(totalCredits).padEnd(6)} ${"".padEnd(6)} ${cgpa.toFixed(2)}`);
//   console.log(`  Total Courses: ${converted.length}  |  Total US Credit Hours: ${totalCredits}`);
//   console.log("═".repeat(75));
// }

// main().catch(e => { console.error("\n❌ Error:", e.message); process.exit(1); });
