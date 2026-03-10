const Tesseract = require("tesseract.js");
const pdfParseLib = require("pdf-parse");
const pdfParse = typeof pdfParseLib === "function" ? pdfParseLib : pdfParseLib.default || pdfParseLib;
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const os = require("os");

/**
 * Extract text from PDF:
 * 1. Try pdf-parse (works for text-based PDFs)
 * 2. If little/no text extracted, convert pages to images with pdftoppm then OCR each page
 */
async function extractTextFromPDF(filePath) {
  // Step 1: pdfplumber via temp Python script (handles watermarked/complex PDFs best)
  try {
    const scriptPath = path.join(__dirname, "_pdfextract.py");
    if (!fs.existsSync(scriptPath)) {
      fs.writeFileSync(scriptPath,
        "import pdfplumber, sys\n" +
        "with pdfplumber.open(sys.argv[1]) as pdf:\n" +
        "    text = ''\n" +
        "    for page in pdf.pages:\n" +
        "        t = page.extract_text()\n" +
        "        if t: text += t + '\\n\\n'\n" +
        "    print(text)\n"
      );
    }
    const { execFileSync } = require("child_process");
    const result = execFileSync("python3", [scriptPath, filePath],
      { timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
    const text = result.toString().trim();
    if (text.length >= 100) {
      console.log(`pdfplumber extracted ${text.length} characters`);
      return text;
    }
  } catch (err) {
    console.warn("pdfplumber failed:", err.message.substring(0, 80), "— trying pdf-parse...");
  }

  // Step 2: pdf-parse fallback
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);
    const extractedText = data.text.trim();
    console.log(`pdf-parse extracted ${extractedText.length} characters`);
    if (extractedText.length >= 100) return extractedText;
  } catch (err) {
    console.warn("pdf-parse failed:", err.message, "— trying OCR...");
  }

  // Step 3: OCR fallback for scanned PDFs with no text layer
  return await extractTextFromScannedPDF(filePath);
}

async function extractTextFromScannedPDF(filePath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "transcript-ocr-"));
  const outputPrefix = path.join(tmpDir, "page");

  try {
    console.log(`Converting PDF to images in ${tmpDir}...`);

    // Use pdftoppm to convert PDF pages to PNG images at 300 DPI (good for OCR)
    const result = spawnSync("pdftoppm", [
      "-png",       // output PNG format
      "-r", "400",  // 400 DPI — better for dense/noisy transcripts
      filePath,
      outputPrefix,
    ], { timeout: 120000 }); // 2 min timeout

    if (result.error) throw new Error(`pdftoppm failed: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`pdftoppm exited ${result.status}: ${result.stderr?.toString()}`);

    // Find all generated page images (sorted)
    const pageFiles = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith(".png"))
      .sort()
      .map(f => path.join(tmpDir, f));

    if (pageFiles.length === 0) throw new Error("pdftoppm produced no images");
    console.log(`OCR-ing ${pageFiles.length} page(s)...`);

    // OCR each page and concatenate text
    const pageTexts = [];
    for (const pageFile of pageFiles) {
      const text = await ocrImage(pageFile);
      pageTexts.push(text);
      console.log(`  Page ${pageTexts.length}: ${text.length} chars extracted`);
    }

    const fullText = pageTexts.join("\n\n");
    const cleaned = cleanOCRNoise(fullText);
    console.log(`OCR: ${fullText.length} raw chars → ${cleaned.length} after noise removal`);
    return cleaned;

  } finally {
    // Always clean up temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Could not clean up temp dir:", e.message);
    }
  }
}

/**
 * Run Tesseract OCR on an image file
 * Pre-processes with sharp to improve accuracy
 */
async function ocrImage(imagePath) {
  try {
    // Pre-process: convert to greyscale + increase contrast for better OCR
    const processedPath = imagePath.replace(".png", "_processed.png");
    await sharp(imagePath)
      .greyscale()
      .normalise()
      // Threshold: turn image into pure black/white
      // This kills watermarks which are mid-grey, keeps dark text
      .threshold(180)
      .sharpen({ sigma: 1 })
      .png({ quality: 100 })
      .toFile(processedPath);

    const { data: { text } } = await Tesseract.recognize(processedPath, "eng", {
      logger: m => {
        if (m.status === "recognizing text") {
          process.stdout.write(`\r  OCR progress: ${(m.progress * 100).toFixed(0)}%`);
        }
      },
      tessedit_pageseg_mode: "6",   // PSM 6: assume uniform block of text — better for tables
      preserve_interword_spaces: "1",
    });

    // Clean up processed file
    try { fs.unlinkSync(processedPath); } catch (e) {}
    process.stdout.write("\n");
    return text;

  } catch (err) {
    console.error("OCR error on", imagePath, err.message);
    // Fall back to raw OCR without pre-processing
    try {
      const { data: { text } } = await Tesseract.recognize(imagePath, "eng", {});
      return text;
    } catch (e2) {
      console.error("Fallback OCR also failed:", e2.message);
      return "";
    }
  }
}

/**
 * Extract text from a JPG/PNG image upload
 */
async function processImage(filePath) {
  try {
    // Convert to PNG if not already (better OCR results)
    if (!filePath.toLowerCase().endsWith(".png")) {
      const pngPath = filePath + "_converted.png";
      await sharp(filePath).png().toFile(pngPath);
      const text = await ocrImage(pngPath);
      try { fs.unlinkSync(pngPath); } catch (e) {}
      return text;
    }
    return await ocrImage(filePath);
  } catch (err) {
    console.error("Image processing error:", err);
    throw new Error("Failed to process image: " + err.message);
  }
}

/**
 * Main entry point — routes to correct extractor based on file type
 */
async function extractText(filePath, fileType) {
  console.log(`Extracting text from ${fileType}...`);
  let text = "";

  if (fileType === "application/pdf") {
    text = await extractTextFromPDF(filePath);
  } else if (["image/jpeg", "image/png", "image/jpg"].includes(fileType)) {
    text = await processImage(filePath);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  console.log(`Extraction complete: ${text.length} characters`);
  return text;
}


/**
 * Remove repeating watermark text and OCR noise
 */
function cleanOCRNoise(text) {
  const lines = text.split("\n");
  const freq = {};
  for (const l of lines) { const t = l.trim(); if (t) freq[t] = (freq[t]||0)+1; }
  const threshold = Math.max(3, lines.length * 0.08);
  const cleaned = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.length < 3) continue;
    if (freq[t] > threshold) continue; // watermark
    if (/^[-=_|~]{3,}$/.test(t)) continue; // separator noise
    const alphaRatio = (t.match(/[a-zA-Z0-9]/g)||[]).length / t.length;
    if (alphaRatio < 0.35 && t.length < 15) continue; // garbled short line
    cleaned.push(t);
  }
  return cleaned.join("\n");
}

module.exports = {
  extractText,
  extractTextFromPDF,
  extractTextFromScannedPDF,
  processImage,
  ocrImage,
  cleanOCRNoise,
};

// const Tesseract = require("tesseract.js");
// const pdfParseLib = require("pdf-parse");
// const pdfParse = typeof pdfParseLib === "function" ? pdfParseLib : pdfParseLib.default || pdfParseLib;
// const sharp = require("sharp");
// const fs = require("fs");
// const path = require("path");
// const { execSync, spawnSync } = require("child_process");
// const os = require("os");

// /**
//  * Extract text from PDF:
//  * 1. Try pdf-parse (works for text-based PDFs)
//  * 2. If little/no text extracted, convert pages to images with pdftoppm then OCR each page
//  */
// async function extractTextFromPDF(filePath) {
//   // Step 1: Try direct text extraction
//   try {
//     const fileBuffer = fs.readFileSync(filePath);
//     const data = await pdfParse(fileBuffer);
//     const extractedText = data.text.trim();
//     console.log(`pdf-parse extracted ${extractedText.length} characters`);

//     if (extractedText.length >= 100) {
//       return extractedText;
//     }
//     console.log("Text-based extraction insufficient — falling back to OCR...");
//   } catch (err) {
//     console.warn("pdf-parse failed:", err.message, "— trying OCR...");
//   }

//   // Step 2: Convert PDF pages to images, then OCR
//   return await extractTextFromScannedPDF(filePath);
// }

// /**
//  * Convert a scanned PDF to images using pdftoppm, then OCR each page
//  */
// async function extractTextFromScannedPDF(filePath) {
//   const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "transcript-ocr-"));
//   const outputPrefix = path.join(tmpDir, "page");

//   try {
//     console.log(`Converting PDF to images in ${tmpDir}...`);

//     // Use pdftoppm to convert PDF pages to PNG images at 300 DPI (good for OCR)
//     const result = spawnSync("pdftoppm", [
//       "-png",       // output PNG format
//       "-r", "400",  // 400 DPI — better for dense/noisy transcripts
//       filePath,
//       outputPrefix,
//     ], { timeout: 120000 }); // 2 min timeout

//     if (result.error) throw new Error(`pdftoppm failed: ${result.error.message}`);
//     if (result.status !== 0) throw new Error(`pdftoppm exited ${result.status}: ${result.stderr?.toString()}`);

//     // Find all generated page images (sorted)
//     const pageFiles = fs.readdirSync(tmpDir)
//       .filter(f => f.endsWith(".png"))
//       .sort()
//       .map(f => path.join(tmpDir, f));

//     if (pageFiles.length === 0) throw new Error("pdftoppm produced no images");
//     console.log(`OCR-ing ${pageFiles.length} page(s)...`);

//     // OCR each page and concatenate text
//     const pageTexts = [];
//     for (const pageFile of pageFiles) {
//       const text = await ocrImage(pageFile);
//       pageTexts.push(text);
//       console.log(`  Page ${pageTexts.length}: ${text.length} chars extracted`);
//     }

//     const fullText = pageTexts.join("\n\n");
//     const cleaned = cleanOCRNoise(fullText);
//     console.log(`OCR: ${fullText.length} raw chars → ${cleaned.length} after noise removal`);
//     return cleaned;

//   } finally {
//     // Always clean up temp files
//     try {
//       fs.rmSync(tmpDir, { recursive: true, force: true });
//     } catch (e) {
//       console.warn("Could not clean up temp dir:", e.message);
//     }
//   }
// }

// /**
//  * Run Tesseract OCR on an image file
//  * Pre-processes with sharp to improve accuracy
//  */
// async function ocrImage(imagePath) {
//   try {
//     // Pre-process: convert to greyscale + increase contrast for better OCR
//     const processedPath = imagePath.replace(".png", "_processed.png");
//     await sharp(imagePath)
//       .greyscale()
//       .normalise()
//       // Threshold: turn image into pure black/white
//       // This kills watermarks which are mid-grey, keeps dark text
//       .threshold(180)
//       .sharpen({ sigma: 1 })
//       .png({ quality: 100 })
//       .toFile(processedPath);

//     const { data: { text } } = await Tesseract.recognize(processedPath, "eng", {
//       logger: m => {
//         if (m.status === "recognizing text") {
//           process.stdout.write(`\r  OCR progress: ${(m.progress * 100).toFixed(0)}%`);
//         }
//       },
//       tessedit_pageseg_mode: "6",   // PSM 6: assume uniform block of text — better for tables
//       preserve_interword_spaces: "1",
//     });

//     // Clean up processed file
//     try { fs.unlinkSync(processedPath); } catch (e) {}
//     process.stdout.write("\n");
//     return text;

//   } catch (err) {
//     console.error("OCR error on", imagePath, err.message);
//     // Fall back to raw OCR without pre-processing
//     try {
//       const { data: { text } } = await Tesseract.recognize(imagePath, "eng", {});
//       return text;
//     } catch (e2) {
//       console.error("Fallback OCR also failed:", e2.message);
//       return "";
//     }
//   }
// }

// /**
//  * Extract text from a JPG/PNG image upload
//  */
// async function processImage(filePath) {
//   try {
//     // Convert to PNG if not already (better OCR results)
//     if (!filePath.toLowerCase().endsWith(".png")) {
//       const pngPath = filePath + "_converted.png";
//       await sharp(filePath).png().toFile(pngPath);
//       const text = await ocrImage(pngPath);
//       try { fs.unlinkSync(pngPath); } catch (e) {}
//       return text;
//     }
//     return await ocrImage(filePath);
//   } catch (err) {
//     console.error("Image processing error:", err);
//     throw new Error("Failed to process image: " + err.message);
//   }
// }

// /**
//  * Main entry point — routes to correct extractor based on file type
//  */
// async function extractText(filePath, fileType) {
//   console.log(`Extracting text from ${fileType}...`);
//   let text = "";

//   if (fileType === "application/pdf") {
//     text = await extractTextFromPDF(filePath);
//   } else if (["image/jpeg", "image/png", "image/jpg"].includes(fileType)) {
//     text = await processImage(filePath);
//   } else {
//     throw new Error(`Unsupported file type: ${fileType}`);
//   }

//   console.log(`Extraction complete: ${text.length} characters`);
//   return text;
// }


// /**
//  * Remove repeating watermark text and OCR noise
//  */
// function cleanOCRNoise(text) {
//   const lines = text.split("\n");
//   const freq = {};
//   for (const l of lines) { const t = l.trim(); if (t) freq[t] = (freq[t]||0)+1; }
//   const threshold = Math.max(3, lines.length * 0.08);
//   const cleaned = [];
//   for (const line of lines) {
//     const t = line.trim();
//     if (!t || t.length < 3) continue;
//     if (freq[t] > threshold) continue; // watermark
//     if (/^[-=_|~]{3,}$/.test(t)) continue; // separator noise
//     const alphaRatio = (t.match(/[a-zA-Z0-9]/g)||[]).length / t.length;
//     if (alphaRatio < 0.35 && t.length < 15) continue; // garbled short line
//     cleaned.push(t);
//   }
//   return cleaned.join("\n");
// }

// module.exports = {
//   extractText,
//   extractTextFromPDF,
//   extractTextFromScannedPDF,
//   processImage,
//   ocrImage,
//   cleanOCRNoise,
// };