const fs = require("fs");
const Papa = require("papaparse");
const XLSX = require("xlsx");
const { processCoursesWithGPA } = require("./gpaConverter");

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    
    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(new Error("CSV parsing failed: " + error.message));
        },
      });
    });
  } catch (error) {
    throw new Error("Failed to read CSV file: " + error.message);
  }
}

/**
 * Parse Excel/XLSX file
 */
function parseExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    throw new Error("Failed to parse Excel file: " + error.message);
  }
}

/**
 * Parse TXT file (plain text)
 */
function parseTXT(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch (error) {
    throw new Error("Failed to read TXT file: " + error.message);
  }
}

/**
 * Convert tabular data (from CSV/Excel) to courses array
 */
function tabulartoCourses(data, university = null) {
  const courses = [];
  
  // Try to identify column names (flexible matching)
  let codeCol, titleCol, gradeCol, creditsCol;
  
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0]).map((h) => h.toLowerCase());
    
    // Find columns by keywords
    codeCol = headers.findIndex((h) => /code|course/.test(h));
    titleCol = headers.findIndex((h) => /title|name|course|subject/.test(h));
    gradeCol = headers.findIndex((h) => /grade|marks|percentage|score/.test(h));
    creditsCol = headers.findIndex((h) => /credit|hour|unit|cr/.test(h));
    
    const headerArray = Object.keys(data[0]);
    
    for (const row of data) {
      if (
        row[headerArray[codeCol]] &&
        row[headerArray[titleCol]] &&
        row[headerArray[gradeCol]]
      ) {
        courses.push({
          code: String(row[headerArray[codeCol]]).toUpperCase(),
          title: String(row[headerArray[titleCol]]),
          grade: String(row[headerArray[gradeCol]]).includes("%")
            ? String(row[headerArray[gradeCol]])
            : String(row[headerArray[gradeCol]]) + "%",
          credits: parseFloat(row[headerArray[creditsCol]]) || 3,
        });
      }
    }
  }
  
  // Apply GPA conversion to the courses
  return processCoursesWithGPA(courses, university);
}

module.exports = {
  parseCSV,
  parseExcel,
  parseTXT,
  tabulartoCourses,
};
