/**
 * WES (World Education Services) Grade Conversion Tables
 * Official percentage to GPA conversion for Indian universities
 */

const WES_CONVERSION_TABLE = {
  // Standard WES conversion table for percentage to 4.0 GPA
  percentageToGPA: {
    // Range: [min, max] -> GPA value
    "90-100": 4.0,    // A
    "85-89": 3.7,     // A-
    "80-84": 3.3,     // B+
    "75-79": 3.0,     // B
    "70-74": 2.7,     // B-
    "65-69": 2.3,     // C+
    "60-64": 2.0,     // C
    "55-59": 1.7,     // C-
    "50-54": 1.3,     // D+
    "45-49": 1.0,     // D
    "0-44": 0.0,      // F
  },

  // Letter grade mappings (for display)
  gpaToLetterGrade: {
    4.0: "A",
    3.7: "A-",
    3.3: "B+",
    3.0: "B",
    2.7: "B-",
    2.3: "C+",
    2.0: "C",
    1.7: "C-",
    1.3: "D+",
    1.0: "D",
    0.0: "F",
  },

  // University-specific variations (if needed)
  universitySpecific: {
    "IIT Bombay": {
      // IITs often have stricter grading
      "90-100": 4.0,
      "85-89": 3.7,
      "80-84": 3.3,
      "75-79": 3.0,
      "70-74": 2.7,
      "65-69": 2.3,
      "60-64": 2.0,
      "55-59": 1.7,
      "50-54": 1.3,
      "45-49": 1.0,
      "0-44": 0.0,
    },
    "Delhi University": {
      // DU has different grading scale
      "95-100": 4.0,
      "90-94": 3.7,
      "85-89": 3.3,
      "80-84": 3.0,
      "75-79": 2.7,
      "70-74": 2.3,
      "65-69": 2.0,
      "60-64": 1.7,
      "55-59": 1.3,
      "50-54": 1.0,
      "0-49": 0.0,
    },
    // Add more university-specific tables as needed
  },
};

/**
 * Convert percentage grade to GPA using WES conversion table
 * @param {number|string} percentage - The percentage grade (e.g., 87, "87%", 87.5)
 * @param {string} university - University name for specific conversion rules
 * @returns {number} GPA value on 4.0 scale
 */
function convertPercentageToGPA(percentage, university = null) {
  try {
    // Clean the percentage input
    let percent = 0;
    if (typeof percentage === "string") {
      // Remove % sign and parse
      percent = parseFloat(percentage.replace("%", "").trim());
    } else if (typeof percentage === "number") {
      percent = percentage;
    }

    // Validate percentage range
    if (isNaN(percent) || percent < 0 || percent > 100) {
      console.warn(`Invalid percentage: ${percentage}, using 0`);
      return 0.0;
    }

    // Choose conversion table
    let conversionTable = WES_CONVERSION_TABLE.percentageToGPA;

    // Use university-specific table if available
    if (university && WES_CONVERSION_TABLE.universitySpecific[university]) {
      conversionTable = WES_CONVERSION_TABLE.universitySpecific[university];
    }

    // Find the appropriate GPA range
    for (const [range, gpa] of Object.entries(conversionTable)) {
      const [min, max] = range.split("-").map(Number);
      if (percent >= min && percent <= max) {
        return gpa;
      }
    }

    // Fallback for edge cases
    return 0.0;
  } catch (error) {
    console.error("GPA conversion error:", error);
    return 0.0;
  }
}

/**
 * Convert GPA to letter grade
 * @param {number} gpa - GPA value
 * @returns {string} Letter grade (A, A-, B+, etc.)
 */
function convertGPAToLetterGrade(gpa) {
  try {
    const roundedGPA = Math.round(gpa * 10) / 10; // Round to 1 decimal place
    return WES_CONVERSION_TABLE.gpaToLetterGrade[roundedGPA] || "F";
  } catch (error) {
    console.error("Letter grade conversion error:", error);
    return "F";
  }
}

/**
 * Convert letter grade to GPA (reverse lookup)
 * @param {string} letterGrade - Letter grade (A, A-, B+, etc.)
 * @returns {number} GPA value
 */
function convertLetterGradeToGPA(letterGrade) {
  try {
    const gradeMap = {
      "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
      "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0,
      "A+": 4.0, "D-": 0.7, // Additional grades sometimes used
    };

    return gradeMap[letterGrade.toUpperCase()] || 0.0;
  } catch (error) {
    console.error("Letter grade to GPA conversion error:", error);
    return 0.0;
  }
}

/**
 * Calculate weighted GPA for a list of courses
 * @param {Array} courses - Array of course objects with gpa and credits
 * @returns {number} Weighted GPA
 */
function calculateWeightedGPA(courses) {
  try {
    if (!courses || courses.length === 0) return 0.0;

    let totalWeightedPoints = 0;
    let totalCredits = 0;

    for (const course of courses) {
      const gpa = course.gpa || course.convertedGPA || 0;
      const credits = course.usCredits || course.credits || 3;

      totalWeightedPoints += gpa * credits;
      totalCredits += credits;
    }

    return totalCredits > 0 ? totalWeightedPoints / totalCredits : 0.0;
  } catch (error) {
    console.error("Weighted GPA calculation error:", error);
    return 0.0;
  }
}

/**
 * Process courses and add GPA conversions
 * @param {Array} courses - Raw courses from transcript parsing
 * @param {string} university - University name
 * @returns {Array} Courses with GPA conversions added
 */
function processCoursesWithGPA(courses, university = null) {
  try {
    return courses.map(course => {
      // Convert percentage to GPA if we have a percentage grade
      let convertedGPA = course.gpa || 0; // Use existing GPA if available
      let usGrade = course.usGrade || "";

      if (course.grade && !course.gpa) {
        // Extract percentage from grade string
        const percentageMatch = course.grade.match(/(\d+(?:\.\d+)?)/);
        if (percentageMatch) {
          const percentage = parseFloat(percentageMatch[1]);
          convertedGPA = convertPercentageToGPA(percentage, university);
          usGrade = convertGPAToLetterGrade(convertedGPA);
        }
      }

      return {
        ...course,
        convertedGPA,
        usGrade,
        usCredits: course.usCredits || course.credits || 3, // Normalize credits
      };
    });
  } catch (error) {
    console.error("Course GPA processing error:", error);
    return courses;
  }
}

module.exports = {
  WES_CONVERSION_TABLE,
  convertPercentageToGPA,
  convertGPAToLetterGrade,
  convertLetterGradeToGPA,
  calculateWeightedGPA,
  processCoursesWithGPA,
};
