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
  // Step 1: Try direct text extraction
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);
    const extractedText = data.text.trim();
    console.log(`pdf-parse extracted ${extractedText.length} characters`);

    if (extractedText.length >= 100) {
      return extractedText;
    }
    console.log("Text-based extraction insufficient — falling back to OCR...");
  } catch (err) {
    console.warn("pdf-parse failed:", err.message, "— trying OCR...");
  }

  // Step 2: Convert PDF pages to images, then OCR
  return await extractTextFromScannedPDF(filePath);
}

/**
 * Convert a scanned PDF to images using pdftoppm, then OCR each page
 */
async function extractTextFromScannedPDF(filePath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "transcript-ocr-"));
  const outputPrefix = path.join(tmpDir, "page");

  try {
    console.log(`Converting PDF to images in ${tmpDir}...`);

    // Use pdftoppm to convert PDF pages to PNG images at 300 DPI (good for OCR)
    const result = spawnSync("pdftoppm", [
      "-png",       // output PNG format
      "-r", "300",  // 300 DPI — high enough for good OCR accuracy
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
    console.log(`Total OCR text: ${fullText.length} characters`);
    return fullText;

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
      .normalise()           // auto levels
      .linear(1.4, -(128 * 1.4) + 128)  // boost contrast
      .sharpen({ sigma: 1.5 })           // crisp text edges
      .median(1)                         // reduce noise/specks
      .png({ quality: 100 })
      .toFile(processedPath);

    const { data: { text } } = await Tesseract.recognize(processedPath, "eng", {
      logger: m => {
        if (m.status === "recognizing text") {
          process.stdout.write(`\r  OCR progress: ${(m.progress * 100).toFixed(0)}%`);
        }
      },
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

module.exports = {
  extractText,
  extractTextFromPDF,
  extractTextFromScannedPDF,
  processImage,
  ocrImage,
};

// const Tesseract = require("tesseract.js");
// const pdfParse = require("pdf-parse");
// const sharp = require("sharp");
// const fs = require("fs");
// const path = require("path");

// /**
//  * Extract text from PDF file using pdf-parse or fallback to OCR
//  */
// async function extractTextFromPDF(filePath) {
//   try {
//     // First try pdf-parse for text-based PDFs
//     const fileBuffer = fs.readFileSync(filePath);
//     const data = await pdfParse(fileBuffer);
//     console.log("PDF parsed with pdf-parse, text length:", data.text.length);

//     // If we got very little text, it might be an image-based PDF, so try OCR
//     if (data.text.trim().length < 100) {
//       console.log("PDF has little text, trying OCR...");
//       return await extractTextFromImage(filePath);
//     }

//     return data.text;
//   } catch (error) {
//     console.error("PDF text extraction failed:", error.message);
//     // For now, just return empty string instead of trying OCR
//     // OCR on PDFs requires converting PDF to images first
//     return "";
//   }
// }

// /**
//  * Extract text from image using OCR (Tesseract)
//  */
// async function extractTextFromImage(filePath) {
//   try {
//     // Use Tesseract.js for OCR
//     const { data: { text } } = await Tesseract.recognize(filePath, "eng", {
//       logger: (m) => console.log("OCR Progress:", m),
//     });
    
//     return text;
//   } catch (error) {
//     console.error("OCR extraction error:", error);
//     throw new Error("Failed to extract text from image: " + error.message);
//   }
// }

// /**
//  * Process image file (convert if needed, then OCR)
//  */
// async function processImage(filePath) {
//   try {
//     const ext = filePath.toLowerCase().split(".").pop();
    
//     // If not PNG, convert to PNG first for better OCR compatibility
//     if (ext !== "png") {
//       const outputPath = filePath.replace(/\.[^.]+$/, ".png");
//       await sharp(filePath)
//         .png()
//         .toFile(outputPath);
      
//       const text = await extractTextFromImage(outputPath);
//       // Clean up temp file
//       fs.unlinkSync(outputPath);
//       return text;
//     } else {
//       return await extractTextFromImage(filePath);
//     }
//   } catch (error) {
//     console.error("Image processing error:", error);
//     throw new Error("Failed to process image: " + error.message);
//   }
// }

// /**
//  * Main extraction function - handles all file types
//  */
// async function extractText(filePath, fileType) {
//   try {
//     console.log(`Extracting text from ${fileType} file...`);
    
//     let text = "";
    
//     if (fileType === "application/pdf") {
//       text = await extractTextFromPDF(filePath);
//     } else if (["image/jpeg", "image/png", "image/jpg"].includes(fileType)) {
//       text = await processImage(filePath);
//     } else {
//       throw new Error(`Unsupported file type: ${fileType}`);
//     }
    
//     console.log(`Extracted ${text.length} characters`);
//     return text;
//   } catch (error) {
//     console.error("Text extraction error:", error);
//     throw error;
//   }
// }

// module.exports = {
//   extractText,
//   extractTextFromPDF,
//   extractTextFromImage,
//   processImage,
// };
