const { processCoursesWithGPA, calculateWeightedGPA } = require("./gpaConverter");

function parseTranscriptText(text, university = null) {
  try {
    console.log("Parsing transcript text, length:", text.length);
    const courses = [];

    // Split into lines
    const lines = text.split("\n").map((line) => line.trim());

    // Process multi-line course entries (format: Course Code: CODE, Course Name: TITLE, Credits: NUM, Grade: PERCENT)
    let currentCourse = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines and header-only lines
      if (!line || /^(transcript|student|university|program|semester|total)\s*$|^(course|code|title|grade|credit|gpa)\s*$|^-+$|^=+$/i.test(line)) {
        continue;
      }

      // Check for course code line
      const codeMatch = line.match(/^Course Code:\s*(.+)$/i);
      if (codeMatch) {
        // Save previous course if exists
        if (currentCourse && currentCourse.code && currentCourse.title && currentCourse.grade && currentCourse.credits) {
          courses.push(currentCourse);
        }
        // Start new course
        currentCourse = { code: codeMatch[1].trim() };
        continue;
      }

      // Check for course name line
      const nameMatch = line.match(/^Course Name:\s*(.+)$/i);
      if (nameMatch && currentCourse) {
        currentCourse.title = nameMatch[1].trim();
        continue;
      }

      // Check for credits line
      const creditsMatch = line.match(/^Credits?:\s*(.+)$/i);
      if (creditsMatch && currentCourse) {
        currentCourse.credits = parseFloat(creditsMatch[1].trim());
        continue;
      }

      // Check for grade line
      const gradeMatch = line.match(/^Grade:\s*(.+)$/i);
      if (gradeMatch && currentCourse) {
        currentCourse.grade = gradeMatch[1].trim();
        continue;
      }
    }

    // Add the last course if complete
    if (currentCourse && currentCourse.code && currentCourse.title && currentCourse.grade && currentCourse.credits) {
      courses.push(currentCourse);
      console.log("Added course:", currentCourse);
    }

    console.log("Found", courses.length, "courses from multi-line parsing");

    // Common patterns for course entries (single-line format)
    // Pattern 1: CODE TITLE GRADE CREDITS (e.g., "CS301 Data Structures 87% 4")
    // Pattern 2: CODE - TITLE | GRADE | CREDITS
    // Pattern 3: Multiple columns with headers

    const coursePatterns = [
      // Pattern: CODE TITLE PERCENTAGE CREDITS
      /^([A-Z]{2,}\d{3,4})\s+(.+?)\s+(\d{1,3}%?)\s+(\d+(?:\.\d+)?)\s*$/,

      // Pattern: CODE - TITLE - GRADE - CREDITS
      /^([A-Z]{2,}\d{3,4})\s*-\s*(.+?)\s*-\s*(\d{1,3}%?)\s*-\s*(\d+(?:\.\d+)?)/,

      // Pattern: CODE | TITLE | GRADE | CREDITS
      /^([A-Z]{2,}\d{3,4})\s*\|\s*(.+?)\s*\|\s*(\d{1,3}%?)\s*\|\s*(\d+(?:\.\d+)?)/,
    ];

    // Process each line for single-line patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines and headers
      if (!line || /^(course|code|title|grade|credit|gpa)/i.test(line)) {
        continue;
      }

      // Try each pattern
      for (const pattern of coursePatterns) {
        const match = line.match(pattern);
        if (match) {
          const [, code, title, grade, credits] = match;

          courses.push({
            code: code.toUpperCase(),
            title: title.trim(),
            grade: grade.includes("%") ? grade : grade + "%",
            credits: parseFloat(credits),
          });
          break;
        }
      }
    }
    
    // Apply GPA conversion to all courses
    const coursesWithGPA = processCoursesWithGPA(courses, university);
    
    return coursesWithGPA;
  } catch (error) {
    console.error("Parsing error:", error);
    return [];
  }
}

/**
 * Extract university name from transcript text
 */
function detectUniversity(text) {
  const universities = [
    { name: "IIT Bombay", keywords: ["IIT Bombay", "Indian Institute of Technology Bombay", "IITB"] },
    { name: "Delhi University", keywords: ["Delhi University", "University of Delhi", "DU"] },
    { name: "VTU", keywords: ["VTU", "Visvesvaraya Technological University"] },
    { name: "Anna University", keywords: ["Anna University", "Anna Univ"] },
    { name: "Mumbai University", keywords: ["Mumbai University", "University of Mumbai"] },
    { name: "JNTU", keywords: ["JNTU", "Jawaharlal Nehru Technological University"] },
    { name: "Pune University", keywords: ["Pune University", "University of Pune"] },
    { name: "Osmania University", keywords: ["Osmania University", "Osmania Univ"] },
  ];
  
  const textLower = text.toLowerCase();
  
  for (const uni of universities) {
    for (const keyword of uni.keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        return uni.name;
      }
    }
  }
  
  return "Unknown University";
}

/**
 * Calculate totals and statistics
 */
function calculateStats(courses) {
  if (!courses || courses.length === 0) {
    return {
      totalCourses: 0,
      totalCredits: 0,
      averageGrade: 0,
      weightedGPA: 0,
    };
  }
  
  const totalCredits = courses.reduce((sum, c) => sum + (c.usCredits || c.credits || 3), 0);
  const gradeNumValues = courses
    .map((c) => {
      const gradeStr = c.grade.replace("%", "");
      return parseFloat(gradeStr);
    })
    .filter((g) => !isNaN(g));
  
  const averageGrade = gradeNumValues.length > 0 
    ? (gradeNumValues.reduce((a, b) => a + b, 0) / gradeNumValues.length).toFixed(2)
    : 0;
  
  // Calculate weighted GPA using the converted GPAs
  const weightedGPA = calculateWeightedGPA(courses);
  
  return {
    totalCourses: courses.length,
    totalCredits,
    averageGrade,
    weightedGPA: parseFloat(weightedGPA.toFixed(2)),
  };
}

module.exports = {
  parseTranscriptText,
  detectUniversity,
  calculateStats,
};
