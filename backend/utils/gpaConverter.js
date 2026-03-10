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
// ABS grading: A+=90-100%, A=80-89%, B+=70-79%, B=60-69%, C=50-59%, D=40-49%, E=<40%
// WES converts the UNDERLYING PERCENTAGE RANGE, not letter-for-letter
const ABS_LETTER_TO_WES = {
  "A+": { gpa: 4.0, usGrade: "A"  },  // 90-100%
  "A":  { gpa: 3.3, usGrade: "B+" },  // 80-89%
  "B+": { gpa: 2.7, usGrade: "B-" },  // 70-79%
  "B":  { gpa: 2.0, usGrade: "C"  },  // 60-69%
  "C":  { gpa: 1.3, usGrade: "D+" },  // 50-59%
  "D":  { gpa: 0.7, usGrade: "D-" },  // 40-49%
  "E":  { gpa: 0.0, usGrade: "F"  },  // <40%
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