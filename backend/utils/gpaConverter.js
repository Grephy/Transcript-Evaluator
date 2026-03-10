/**
 * WES Grade Conversion — supports percentage, letter grades, and 10-point scales
 */

// Standard WES percentage → 4.0 GPA table
const PERCENTAGE_TO_GPA = [
  { min: 90, max: 100, gpa: 4.0, letter: "A"  },
  { min: 85, max: 89,  gpa: 3.7, letter: "A-" },
  { min: 80, max: 84,  gpa: 3.3, letter: "B+" },
  { min: 75, max: 79,  gpa: 3.0, letter: "B"  },
  { min: 70, max: 74,  gpa: 2.7, letter: "B-" },
  { min: 65, max: 69,  gpa: 2.3, letter: "C+" },
  { min: 60, max: 64,  gpa: 2.0, letter: "C"  },
  { min: 55, max: 59,  gpa: 1.7, letter: "C-" },
  { min: 50, max: 54,  gpa: 1.3, letter: "D+" },
  { min: 45, max: 49,  gpa: 1.0, letter: "D"  },
  { min:  0, max: 44,  gpa: 0.0, letter: "F"  },
];

// Standard US letter grade → 4.0 GPA
const LETTER_TO_GPA = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0,  "E": 0.0,
};

// Letter → US letter (for display)
const LETTER_DISPLAY = {
  "A+": "A", "A": "A", "A-": "A-",
  "B+": "B+", "B": "B", "B-": "B-",
  "C+": "C+", "C": "C", "C-": "C-",
  "D+": "D+", "D": "D", "D-": "D-",
  "F": "F", "E": "F",
};

// 10-point numeric scale (IIT-style) → 4.0 GPA
const TEN_POINT_TO_GPA = [
  { min: 9.5, max: 10,  gpa: 4.0, letter: "A"  },
  { min: 8.5, max: 9.4, gpa: 3.7, letter: "A-" },
  { min: 7.5, max: 8.4, gpa: 3.3, letter: "B+" },
  { min: 6.5, max: 7.4, gpa: 3.0, letter: "B"  },
  { min: 5.5, max: 6.4, gpa: 2.3, letter: "C+" },
  { min: 4.5, max: 5.4, gpa: 1.7, letter: "C-" },
  { min: 0,   max: 4.4, gpa: 0.0, letter: "F"  },
];

/**
 * ABS / 10-point letter scale → WES 4.0 GPA
 * ABS: A+(90-100%)=10pts, A(80-89%)=9pts, B+(70-79%)=8pts,
 *      B(60-69%)=7pts, C(50-59%)=6pts, D(40-49%)=5pts, E(≤39%)=0pts
 * WES maps underlying percentage ranges, not letter-for-letter.
 */
const ABS_LETTER_TO_WES = {
  "A+": { gpa: 4.0, usGrade: "A"  },
  "A":  { gpa: 3.7, usGrade: "A-" },
  "B+": { gpa: 3.0, usGrade: "B"  },
  "B":  { gpa: 2.3, usGrade: "C+" },
  "C":  { gpa: 1.7, usGrade: "C-" },
  "D":  { gpa: 1.0, usGrade: "D"  },
  "E":  { gpa: 0.0, usGrade: "F"  },
};

/**
 * Master converter — detects grade type and converts to 4.0 GPA.
 * scaleType hint from aiParser: "10point_letter" | "10point_numeric" | "percentage" | null
 */
function convertToGPA(grade, university = null, scaleType = null) {
  if (!grade || grade === "") return { gpa: 0.0, usGrade: "N/A" };

  const s = String(grade).trim().toUpperCase().replace("%", "");

  // 1. ABS-style 10-point letter scale (explicitly flagged by aiParser)
  if (scaleType === "10point_letter") {
    const result = ABS_LETTER_TO_WES[s];
    if (result) return result;
    return { gpa: 0.0, usGrade: "N/A" };
  }

  // 2. Standard US letter grade (A, B+, C-, etc.)
  if (/^[A-F][+-]?$/.test(s) || s === "E") {
    const gpa = LETTER_TO_GPA[s] ?? 0.0;
    const usGrade = LETTER_DISPLAY[s] ?? "F";
    return { gpa, usGrade };
  }

  const num = parseFloat(s);
  if (isNaN(num)) return { gpa: 0.0, usGrade: "F" };

  // 3. Explicit 10-point numeric scale (IITs)
  if (scaleType === "10point_numeric" || (!String(grade).includes("%") && num <= 10)) {
    for (const row of TEN_POINT_TO_GPA) {
      if (num >= row.min && num <= row.max) return { gpa: row.gpa, usGrade: row.letter };
    }
  }

  // 4. Percentage (0–100)
  for (const row of PERCENTAGE_TO_GPA) {
    if (num >= row.min && num <= row.max) return { gpa: row.gpa, usGrade: row.letter };
  }

  return { gpa: 0.0, usGrade: "F" };
}

function convertPercentageToGPA(percentage, university = null) {
  const num = parseFloat(String(percentage).replace("%", ""));
  if (isNaN(num)) return 0.0;
  for (const row of PERCENTAGE_TO_GPA) {
    if (num >= row.min && num <= row.max) return row.gpa;
  }
  return 0.0;
}

function convertGPAToLetterGrade(gpa) {
  const map = { 4.0:"A", 3.7:"A-", 3.3:"B+", 3.0:"B", 2.7:"B-", 2.3:"C+", 2.0:"C", 1.7:"C-", 1.3:"D+", 1.0:"D", 0.0:"F" };
  return map[Math.round(gpa * 10) / 10] || "F";
}

function convertLetterGradeToGPA(letterGrade) {
  return LETTER_TO_GPA[String(letterGrade).toUpperCase()] ?? 0.0;
}

function calculateWeightedGPA(courses) {
  if (!courses || courses.length === 0) return 0.0;
  const validCourses = courses.filter(c => (c.convertedGPA ?? c.gpa ?? 0) > 0);
  if (validCourses.length === 0) return 0.0;
  const totalCredits = validCourses.reduce((s, c) => s + (c.usCredits || c.credits || 3), 0);
  const weighted = validCourses.reduce((s, c) => s + ((c.convertedGPA ?? c.gpa ?? 0) * (c.usCredits || c.credits || 3)), 0);
  return totalCredits > 0 ? weighted / totalCredits : 0.0;
}

function processCoursesWithGPA(courses, university = null) {
  return courses.map((course, i) => {
    const grade = course.grade || "";
    // scaleType may be set by aiParser on each course object
    const scaleType = course.gradeScaleType || null;
    const { gpa, usGrade } = convertToGPA(grade, university, scaleType);
    return {
      ...course,
      code: course.code || `SUB${String(i+1).padStart(3,"0")}`,
      usCredits: course.usCredits || course.credits || 3,
      convertedGPA: gpa,
      usGrade,
    };
  });
}

module.exports = {
  convertToGPA,
  convertPercentageToGPA,
  convertGPAToLetterGrade,
  convertLetterGradeToGPA,
  calculateWeightedGPA,
  processCoursesWithGPA,
  WES_CONVERSION_TABLE: { percentageToGPA: PERCENTAGE_TO_GPA },
};

// /**
//  * WES (World Education Services) Grade Conversion Tables
//  * Official percentage to GPA conversion for Indian universities
//  */

// const WES_CONVERSION_TABLE = {
//   // Standard WES conversion table for percentage to 4.0 GPA
//   percentageToGPA: {
//     // Range: [min, max] -> GPA value
//     "90-100": 4.0,    // A
//     "85-89": 3.7,     // A-
//     "80-84": 3.3,     // B+
//     "75-79": 3.0,     // B
//     "70-74": 2.7,     // B-
//     "65-69": 2.3,     // C+
//     "60-64": 2.0,     // C
//     "55-59": 1.7,     // C-
//     "50-54": 1.3,     // D+
//     "45-49": 1.0,     // D
//     "0-44": 0.0,      // F
//   },

//   // Letter grade mappings (for display)
//   gpaToLetterGrade: {
//     4.0: "A",
//     3.7: "A-",
//     3.3: "B+",
//     3.0: "B",
//     2.7: "B-",
//     2.3: "C+",
//     2.0: "C",
//     1.7: "C-",
//     1.3: "D+",
//     1.0: "D",
//     0.0: "F",
//   },

//   // University-specific variations (if needed)
//   universitySpecific: {
//     "IIT Bombay": {
//       // IITs often have stricter grading
//       "90-100": 4.0,
//       "85-89": 3.7,
//       "80-84": 3.3,
//       "75-79": 3.0,
//       "70-74": 2.7,
//       "65-69": 2.3,
//       "60-64": 2.0,
//       "55-59": 1.7,
//       "50-54": 1.3,
//       "45-49": 1.0,
//       "0-44": 0.0,
//     },
//     "Delhi University": {
//       // DU has different grading scale
//       "95-100": 4.0,
//       "90-94": 3.7,
//       "85-89": 3.3,
//       "80-84": 3.0,
//       "75-79": 2.7,
//       "70-74": 2.3,
//       "65-69": 2.0,
//       "60-64": 1.7,
//       "55-59": 1.3,
//       "50-54": 1.0,
//       "0-49": 0.0,
//     },
//     // Add more university-specific tables as needed
//   },
// };

// /**
//  * Convert percentage grade to GPA using WES conversion table
//  * @param {number|string} percentage - The percentage grade (e.g., 87, "87%", 87.5)
//  * @param {string} university - University name for specific conversion rules
//  * @returns {number} GPA value on 4.0 scale
//  */
// function convertPercentageToGPA(percentage, university = null) {
//   try {
//     // Clean the percentage input
//     let percent = 0;
//     if (typeof percentage === "string") {
//       // Remove % sign and parse
//       percent = parseFloat(percentage.replace("%", "").trim());
//     } else if (typeof percentage === "number") {
//       percent = percentage;
//     }

//     // Validate percentage range
//     if (isNaN(percent) || percent < 0 || percent > 100) {
//       console.warn(`Invalid percentage: ${percentage}, using 0`);
//       return 0.0;
//     }

//     // Choose conversion table
//     let conversionTable = WES_CONVERSION_TABLE.percentageToGPA;

//     // Use university-specific table if available
//     if (university && WES_CONVERSION_TABLE.universitySpecific[university]) {
//       conversionTable = WES_CONVERSION_TABLE.universitySpecific[university];
//     }

//     // Find the appropriate GPA range
//     for (const [range, gpa] of Object.entries(conversionTable)) {
//       const [min, max] = range.split("-").map(Number);
//       if (percent >= min && percent <= max) {
//         return gpa;
//       }
//     }

//     // Fallback for edge cases
//     return 0.0;
//   } catch (error) {
//     console.error("GPA conversion error:", error);
//     return 0.0;
//   }
// }

// /**
//  * Convert GPA to letter grade
//  * @param {number} gpa - GPA value
//  * @returns {string} Letter grade (A, A-, B+, etc.)
//  */
// function convertGPAToLetterGrade(gpa) {
//   try {
//     const roundedGPA = Math.round(gpa * 10) / 10; // Round to 1 decimal place
//     return WES_CONVERSION_TABLE.gpaToLetterGrade[roundedGPA] || "F";
//   } catch (error) {
//     console.error("Letter grade conversion error:", error);
//     return "F";
//   }
// }

// /**
//  * Convert letter grade to GPA (reverse lookup)
//  * @param {string} letterGrade - Letter grade (A, A-, B+, etc.)
//  * @returns {number} GPA value
//  */
// function convertLetterGradeToGPA(letterGrade) {
//   try {
//     const gradeMap = {
//       "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
//       "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0,
//       "A+": 4.0, "D-": 0.7, // Additional grades sometimes used
//     };

//     return gradeMap[letterGrade.toUpperCase()] || 0.0;
//   } catch (error) {
//     console.error("Letter grade to GPA conversion error:", error);
//     return 0.0;
//   }
// }

// /**
//  * Calculate weighted GPA for a list of courses
//  * @param {Array} courses - Array of course objects with gpa and credits
//  * @returns {number} Weighted GPA
//  */
// function calculateWeightedGPA(courses) {
//   try {
//     if (!courses || courses.length === 0) return 0.0;

//     let totalWeightedPoints = 0;
//     let totalCredits = 0;

//     for (const course of courses) {
//       const gpa = course.gpa || course.convertedGPA || 0;
//       const credits = course.usCredits || course.credits || 3;

//       totalWeightedPoints += gpa * credits;
//       totalCredits += credits;
//     }

//     return totalCredits > 0 ? totalWeightedPoints / totalCredits : 0.0;
//   } catch (error) {
//     console.error("Weighted GPA calculation error:", error);
//     return 0.0;
//   }
// }

// /**
//  * Process courses and add GPA conversions
//  * @param {Array} courses - Raw courses from transcript parsing
//  * @param {string} university - University name
//  * @returns {Array} Courses with GPA conversions added
//  */
// function processCoursesWithGPA(courses, university = null) {
//   try {
//     return courses.map(course => {
//       // Convert percentage to GPA if we have a percentage grade
//       let convertedGPA = course.gpa || 0; // Use existing GPA if available
//       let usGrade = course.usGrade || "";

//       if (course.grade && !course.gpa) {
//         // Extract percentage from grade string
//         const percentageMatch = course.grade.match(/(\d+(?:\.\d+)?)/);
//         if (percentageMatch) {
//           const percentage = parseFloat(percentageMatch[1]);
//           convertedGPA = convertPercentageToGPA(percentage, university);
//           usGrade = convertGPAToLetterGrade(convertedGPA);
//         }
//       }

//       return {
//         ...course,
//         convertedGPA,
//         usGrade,
//         usCredits: course.usCredits || course.credits || 3, // Normalize credits
//       };
//     });
//   } catch (error) {
//     console.error("Course GPA processing error:", error);
//     return courses;
//   }
// }

// module.exports = {
//   WES_CONVERSION_TABLE,
//   convertPercentageToGPA,
//   convertGPAToLetterGrade,
//   convertLetterGradeToGPA,
//   calculateWeightedGPA,
//   processCoursesWithGPA,
// };