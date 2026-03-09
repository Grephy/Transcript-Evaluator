const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

/**
 * Extract text from PDF file using pdf-parse or fallback to OCR
 */
async function extractTextFromPDF(filePath) {
  try {
    // First try pdf-parse for text-based PDFs
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);
    console.log("PDF parsed with pdf-parse, text length:", data.text.length);

    // If we got very little text, it might be an image-based PDF, so try OCR
    if (data.text.trim().length < 100) {
      console.log("PDF has little text, trying OCR...");
      return await extractTextFromImage(filePath);
    }

    return data.text;
  } catch (error) {
    console.error("PDF text extraction failed:", error.message);
    // For now, just return empty string instead of trying OCR
    // OCR on PDFs requires converting PDF to images first
    return "";
  }
}

/**
 * Extract text from image using OCR (Tesseract)
 */
async function extractTextFromImage(filePath) {
  try {
    // Use Tesseract.js for OCR
    const { data: { text } } = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => console.log("OCR Progress:", m),
    });
    
    return text;
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw new Error("Failed to extract text from image: " + error.message);
  }
}

/**
 * Process image file (convert if needed, then OCR)
 */
async function processImage(filePath) {
  try {
    const ext = filePath.toLowerCase().split(".").pop();
    
    // If not PNG, convert to PNG first for better OCR compatibility
    if (ext !== "png") {
      const outputPath = filePath.replace(/\.[^.]+$/, ".png");
      await sharp(filePath)
        .png()
        .toFile(outputPath);
      
      const text = await extractTextFromImage(outputPath);
      // Clean up temp file
      fs.unlinkSync(outputPath);
      return text;
    } else {
      return await extractTextFromImage(filePath);
    }
  } catch (error) {
    console.error("Image processing error:", error);
    throw new Error("Failed to process image: " + error.message);
  }
}

/**
 * Main extraction function - handles all file types
 */
async function extractText(filePath, fileType) {
  try {
    console.log(`Extracting text from ${fileType} file...`);
    
    let text = "";
    
    if (fileType === "application/pdf") {
      text = await extractTextFromPDF(filePath);
    } else if (["image/jpeg", "image/png", "image/jpg"].includes(fileType)) {
      text = await processImage(filePath);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    console.log(`Extracted ${text.length} characters`);
    return text;
  } catch (error) {
    console.error("Text extraction error:", error);
    throw error;
  }
}

module.exports = {
  extractText,
  extractTextFromPDF,
  extractTextFromImage,
  processImage,
};
