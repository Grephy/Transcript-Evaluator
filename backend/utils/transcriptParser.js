const { processCoursesWithGPA, calculateWeightedGPA } = require("./gpaConverter");

/**
 * Main transcript parser - tries multiple strategies in order
 */
function parseTranscriptText(text, university = null) {
  try {
    console.log("Parsing transcript text, length:", text.length);

    let courses = [];

    // Strategy 1: Labeled multi-line format (Course Code: X, Course Name: Y, ...)
    courses = tryLabeledMultiLine(text);
    if (courses.length > 0) {
      console.log(`Strategy 1 (labeled multi-line): found ${courses.length} courses`);
      return processCoursesWithGPA(courses, university);
    }

    // Strategy 2: Table with column headers
    courses = tryTableFormat(text);
    if (courses.length > 0) {
      console.log(`Strategy 2 (table): found ${courses.length} courses`);
      return processCoursesWithGPA(courses, university);
    }

    // Strategy 3: Single-line patterns
    courses = trySingleLine(text);
    if (courses.length > 0) {
      console.log(`Strategy 3 (single-line): found ${courses.length} courses`);
      return processCoursesWithGPA(courses, university);
    }

    // Strategy 4: Heuristic
    courses = tryHeuristic(text);
    if (courses.length > 0) {
      console.log(`Strategy 4 (heuristic): found ${courses.length} courses`);
      return processCoursesWithGPA(courses, university);
    }

    console.warn("No courses found. Raw text preview:", text.substring(0, 500));
    return [];
  } catch (error) {
    console.error("Parsing error:", error);
    return [];
  }
}

// Strategy 1: Labeled multi-line blocks
function tryLabeledMultiLine(text) {
  const courses = [];
  const lines = text.split("\n").map(l => l.trim());
  let current = null;

  for (const line of lines) {
    if (!line) continue;

    const codeMatch = line.match(/^(?:course\s*code|subject\s*code|paper\s*code)\s*[:\-]\s*(.+)$/i);
    if (codeMatch) {
      if (current && isCompleteCourse(current)) courses.push(current);
      current = { code: codeMatch[1].trim() };
      continue;
    }
    const nameMatch = line.match(/^(?:course\s*(?:name|title)|subject\s*(?:name|title)|paper\s*(?:name|title))\s*[:\-]\s*(.+)$/i);
    if (nameMatch && current) { current.title = nameMatch[1].trim(); continue; }

    const creditsMatch = line.match(/^(?:credits?|credit\s*hours?|units?)\s*[:\-]\s*([\d.]+)/i);
    if (creditsMatch && current) { current.credits = parseFloat(creditsMatch[1]); continue; }

    const gradeMatch = line.match(/^(?:grade|marks?|score|percentage|result)\s*[:\-]\s*(.+)$/i);
    if (gradeMatch && current) { current.grade = normalizeGrade(gradeMatch[1].trim()); continue; }
  }

  if (current && isCompleteCourse(current)) courses.push(current);
  return courses;
}

// Strategy 2: Table format with column headers
function tryTableFormat(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const courses = [];
  let headerIdx = -1;
  let colMap = null;

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    const hasCode = /\b(code|s\.no|sr\.?\s*no|no\.?)\b/.test(lower);
    const hasTitle = /\b(title|name|subject|course|paper)\b/.test(lower);
    const hasGrade = /\b(grade|marks?|score|percentage|obtained)\b/.test(lower);
    if ((hasCode || hasTitle) && hasGrade) {
      colMap = detectColumns(lines[i]);
      if (colMap) { headerIdx = i; break; }
    }
  }

  if (headerIdx === -1 || !colMap) return [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || /^[-=]+$/.test(line)) continue;
    if (/\b(total|aggregate|sgpa|cgpa|summary|grand)\b/i.test(line) && !/[A-Z]{2,}\d/.test(line)) continue;
    const course = extractFromColumns(line, colMap);
    if (course && isCompleteCourse(course)) courses.push(course);
  }
  return courses;
}

function detectColumns(headerLine) {
  let parts;
  let sep;
  if (headerLine.includes("\t")) { parts = headerLine.split("\t").map(p => p.trim().toLowerCase()); sep = "tab"; }
  else if (headerLine.includes("|")) { parts = headerLine.split("|").map(p => p.trim().toLowerCase()); sep = "pipe"; }
  else { parts = headerLine.split(/\s{2,}/).map(p => p.trim().toLowerCase()); sep = "space"; }

  if (parts.length < 3) return null;
  const map = { sep, codeIdx: -1, titleIdx: -1, gradeIdx: -1, creditsIdx: -1 };
  parts.forEach((p, i) => {
    if (/code|s\.?no|sr\.?\s*no/.test(p) && map.codeIdx === -1) map.codeIdx = i;
    if (/title|name|subject|course|paper/.test(p) && map.titleIdx === -1) map.titleIdx = i;
    if (/marks?|grade|score|percentage|obtained/.test(p) && map.gradeIdx === -1) map.gradeIdx = i;
    if (/credit|unit|hour/.test(p) && map.creditsIdx === -1) map.creditsIdx = i;
  });
  if (map.gradeIdx === -1) return null;
  return map;
}

function extractFromColumns(line, colMap) {
  let parts;
  if (colMap.sep === "tab") parts = line.split("\t").map(p => p.trim());
  else if (colMap.sep === "pipe") parts = line.split("|").map(p => p.trim());
  else parts = line.split(/\s{2,}/).map(p => p.trim());

  const grade = colMap.gradeIdx >= 0 ? parts[colMap.gradeIdx] : null;
  if (!grade || !looksLikeGrade(grade)) return null;

  return {
    code: colMap.codeIdx >= 0 ? (parts[colMap.codeIdx] || "").toUpperCase().replace(/\s+/, "") : guessCourseCode(line),
    title: colMap.titleIdx >= 0 ? (parts[colMap.titleIdx] || "Unknown Course") : "Unknown Course",
    grade: normalizeGrade(grade),
    credits: colMap.creditsIdx >= 0 ? parseFloat(parts[colMap.creditsIdx]) || 3 : 3,
  };
}

// Strategy 3: Single-line patterns
function trySingleLine(text) {
  const lines = text.split("\n").map(l => l.trim());
  const courses = [];
  const patterns = [
    /^([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\s{2,}(.+?)\s{2,}(\d{2,3}(?:\.\d+)?%?)\s+(\d+(?:\.\d+)?)\s*$/,
    /^([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\s*[-–]\s*(.+?)\s*[-–]\s*(\d{2,3}(?:\.\d+)?%?)\s*[-–]\s*(\d+(?:\.\d+)?)/,
    /^([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\s*\|\s*(.+?)\s*\|\s*(\d{2,3}(?:\.\d+)?%?)\s*\|\s*(\d+(?:\.\d+)?)/,
    /^([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\s{2,}(.+?)\s{2,}([A-F][+-]?)\s+(\d+(?:\.\d+)?)\s*$/,
  ];
  for (const line of lines) {
    if (!line || /^(course|code|title|grade|credit|sl|sr|no\.|subject)/i.test(line)) continue;
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        courses.push({
          code: match[1].trim().toUpperCase().replace(/\s+/, ""),
          title: match[2].trim(),
          grade: normalizeGrade(match[3].trim()),
          credits: parseFloat(match[4]) || 3,
        });
        break;
      }
    }
  }
  return courses;
}

// Strategy 4: Heuristic
function tryHeuristic(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const courses = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeMatch = line.match(/\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b/);
    if (!codeMatch) continue;

    const gradeMatch =
      line.match(/\b(\d{2,3}(?:\.\d+)?)\s*%/) ||
      line.match(/\b([4-9]\d(?:\.\d+)?)\b/) ||
      line.match(/\b([A-F][+-]?)\b/);
    if (!gradeMatch) continue;

    let title = line
      .replace(codeMatch[0], "")
      .replace(gradeMatch[0], "")
      .replace(/\d+\s*$/, "")
      .replace(/[|\-]/g, " ")
      .trim();

    if (title.length < 3) {
      title = (lines[i + 1] && lines[i + 1].length > 3 && !/\d{2,}/.test(lines[i + 1]))
        ? lines[i + 1]
        : "Unknown Course";
    }

    const creditsMatch = line.match(/\b([1-8](?:\.\d+)?)\s*$/);
    courses.push({
      code: codeMatch[1].trim().toUpperCase().replace(/\s+/, ""),
      title: title.substring(0, 80),
      grade: normalizeGrade(gradeMatch[1].trim()),
      credits: creditsMatch ? parseFloat(creditsMatch[1]) : 3,
    });
  }
  return courses;
}

// Helpers
function normalizeGrade(grade) {
  if (!grade) return "0%";
  const s = String(grade).trim();
  if (s.includes("%")) return s;
  if (/^[A-F][+-]?$/.test(s)) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return s + "%";
  return s;
}

function looksLikeGrade(val) {
  if (!val) return false;
  const s = String(val).trim();
  return /^\d{2,3}(\.\d+)?%?$/.test(s) || /^[A-F][+-]?$/.test(s);
}

function guessCourseCode(line) {
  const match = line.match(/\b([A-Z]{2,4}\d{3,4}[A-Z]?)\b/);
  return match ? match[1] : "UNK000";
}

function isCompleteCourse(c) {
  return c && c.code && c.title && c.grade && c.credits > 0;
}

function detectUniversity(text) {
  // Each entry has exact keywords AND fuzzy fragments that survive OCR noise.
  // Fuzzy fragments are short tokens that appear reliably even in garbled text.
  const universities = [
    {
      name: "Asian Business School",
      keywords: ["Asian Business School", "ABS PGDM", "abs.edu.in", "ASIAN BUSINESS SCHOOL"],
      fuzzy: ["asian business", "abs.edu", "asean business", "asian busin"],
    },
    {
      name: "IIT Bombay",
      keywords: ["IIT Bombay", "Indian Institute of Technology Bombay", "IITB"],
      fuzzy: ["iit bombay", "iitb"],
    },
    {
      name: "IIT Delhi",
      keywords: ["IIT Delhi", "Indian Institute of Technology Delhi", "IITD"],
      fuzzy: ["iit delhi", "iitd"],
    },
    {
      name: "IIT Madras",
      keywords: ["IIT Madras", "Indian Institute of Technology Madras"],
      fuzzy: ["iit madras"],
    },
    {
      name: "Delhi University",
      keywords: ["Delhi University", "University of Delhi"],
      fuzzy: ["university of delhi", "delhi university"],
    },
    {
      name: "VTU",
      keywords: ["VTU", "Visvesvaraya Technological University"],
      fuzzy: ["visvesvaraya", "vtu.ac.in"],
    },
    {
      name: "Anna University",
      keywords: ["Anna University"],
      fuzzy: ["anna university", "annauniv"],
    },
    {
      name: "Mumbai University",
      keywords: ["Mumbai University", "University of Mumbai"],
      fuzzy: ["university of mumbai", "mu.ac.in"],
    },
    {
      name: "JNTU",
      keywords: ["JNTU", "Jawaharlal Nehru Technological University"],
      fuzzy: ["jawaharlal nehru tech", "jntu"],
    },
    {
      name: "Pune University",
      keywords: ["Pune University", "University of Pune", "Savitribai Phule"],
      fuzzy: ["savitribai", "unipune"],
    },
    {
      name: "Osmania University",
      keywords: ["Osmania University"],
      fuzzy: ["osmania"],
    },
    {
      name: "Bangalore University",
      keywords: ["Bangalore University", "Bengaluru University"],
      fuzzy: ["bangalore university", "bengaluru university"],
    },
  ];

  const textLower = text.toLowerCase();

  // Pass 1: exact keyword match
  for (const uni of universities) {
    for (const keyword of uni.keywords) {
      if (textLower.includes(keyword.toLowerCase())) return uni.name;
    }
  }

  // Pass 2: fuzzy fragment match (handles OCR-mangled text)
  for (const uni of universities) {
    for (const fragment of (uni.fuzzy || [])) {
      if (textLower.includes(fragment.toLowerCase())) return uni.name;
    }
  }
  return "Unknown University";
}

function calculateStats(courses) {
  if (!courses || courses.length === 0) {
    return { totalCourses: 0, totalCredits: 0, averageGrade: 0, weightedGPA: 0 };
  }
  const totalCredits = courses.reduce((sum, c) => sum + (c.usCredits || c.credits || 3), 0);
  const gradeNumValues = courses
    .map(c => parseFloat(String(c.grade).replace("%", "")))
    .filter(g => !isNaN(g));
  const averageGrade = gradeNumValues.length > 0
    ? (gradeNumValues.reduce((a, b) => a + b, 0) / gradeNumValues.length).toFixed(2)
    : 0;
  const weightedGPA = calculateWeightedGPA(courses);
  return {
    totalCourses: courses.length,
    totalCredits,
    averageGrade,
    weightedGPA: parseFloat(weightedGPA.toFixed(2)),
  };
}

module.exports = { parseTranscriptText, detectUniversity, calculateStats };


// const { processCoursesWithGPA, calculateWeightedGPA } = require("./gpaConverter");

// function parseTranscriptText(text, university = null) {
//   try {
//     console.log("Parsing transcript text, length:", text.length);
//     const courses = [];

//     // Split into lines
//     const lines = text.split("\n").map((line) => line.trim());

//     // Process multi-line course entries (format: Course Code: CODE, Course Name: TITLE, Credits: NUM, Grade: PERCENT)
//     let currentCourse = null;
//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i];

//       // Skip empty lines and header-only lines
//       if (!line || /^(transcript|student|university|program|semester|total)\s*$|^(course|code|title|grade|credit|gpa)\s*$|^-+$|^=+$/i.test(line)) {
//         continue;
//       }

//       // Check for course code line
//       const codeMatch = line.match(/^Course Code:\s*(.+)$/i);
//       if (codeMatch) {
//         // Save previous course if exists
//         if (currentCourse && currentCourse.code && currentCourse.title && currentCourse.grade && currentCourse.credits) {
//           courses.push(currentCourse);
//         }
//         // Start new course
//         currentCourse = { code: codeMatch[1].trim() };
//         continue;
//       }

//       // Check for course name line
//       const nameMatch = line.match(/^Course Name:\s*(.+)$/i);
//       if (nameMatch && currentCourse) {
//         currentCourse.title = nameMatch[1].trim();
//         continue;
//       }

//       // Check for credits line
//       const creditsMatch = line.match(/^Credits?:\s*(.+)$/i);
//       if (creditsMatch && currentCourse) {
//         currentCourse.credits = parseFloat(creditsMatch[1].trim());
//         continue;
//       }

//       // Check for grade line
//       const gradeMatch = line.match(/^Grade:\s*(.+)$/i);
//       if (gradeMatch && currentCourse) {
//         currentCourse.grade = gradeMatch[1].trim();
//         continue;
//       }
//     }

//     // Add the last course if complete
//     if (currentCourse && currentCourse.code && currentCourse.title && currentCourse.grade && currentCourse.credits) {
//       courses.push(currentCourse);
//       console.log("Added course:", currentCourse);
//     }

//     console.log("Found", courses.length, "courses from multi-line parsing");

//     // Common patterns for course entries (single-line format)
//     // Pattern 1: CODE TITLE GRADE CREDITS (e.g., "CS301 Data Structures 87% 4")
//     // Pattern 2: CODE - TITLE | GRADE | CREDITS
//     // Pattern 3: Multiple columns with headers

//     const coursePatterns = [
//       // Pattern: CODE TITLE PERCENTAGE CREDITS
//       /^([A-Z]{2,}\d{3,4})\s+(.+?)\s+(\d{1,3}%?)\s+(\d+(?:\.\d+)?)\s*$/,

//       // Pattern: CODE - TITLE - GRADE - CREDITS
//       /^([A-Z]{2,}\d{3,4})\s*-\s*(.+?)\s*-\s*(\d{1,3}%?)\s*-\s*(\d+(?:\.\d+)?)/,

//       // Pattern: CODE | TITLE | GRADE | CREDITS
//       /^([A-Z]{2,}\d{3,4})\s*\|\s*(.+?)\s*\|\s*(\d{1,3}%?)\s*\|\s*(\d+(?:\.\d+)?)/,
//     ];

//     // Process each line for single-line patterns
//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i];

//       // Skip empty lines and headers
//       if (!line || /^(course|code|title|grade|credit|gpa)/i.test(line)) {
//         continue;
//       }

//       // Try each pattern
//       for (const pattern of coursePatterns) {
//         const match = line.match(pattern);
//         if (match) {
//           const [, code, title, grade, credits] = match;

//           courses.push({
//             code: code.toUpperCase(),
//             title: title.trim(),
//             grade: grade.includes("%") ? grade : grade + "%",
//             credits: parseFloat(credits),
//           });
//           break;
//         }
//       }
//     }
    
//     // Apply GPA conversion to all courses
//     const coursesWithGPA = processCoursesWithGPA(courses, university);
    
//     return coursesWithGPA;
//   } catch (error) {
//     console.error("Parsing error:", error);
//     return [];
//   }
// }

// /**
//  * Extract university name from transcript text
//  */
// function detectUniversity(text) {
//   const universities = [
//     { name: "IIT Bombay", keywords: ["IIT Bombay", "Indian Institute of Technology Bombay", "IITB"] },
//     { name: "Delhi University", keywords: ["Delhi University", "University of Delhi", "DU"] },
//     { name: "VTU", keywords: ["VTU", "Visvesvaraya Technological University"] },
//     { name: "Anna University", keywords: ["Anna University", "Anna Univ"] },
//     { name: "Mumbai University", keywords: ["Mumbai University", "University of Mumbai"] },
//     { name: "JNTU", keywords: ["JNTU", "Jawaharlal Nehru Technological University"] },
//     { name: "Pune University", keywords: ["Pune University", "University of Pune"] },
//     { name: "Osmania University", keywords: ["Osmania University", "Osmania Univ"] },
//   ];
  
//   const textLower = text.toLowerCase();
  
//   for (const uni of universities) {
//     for (const keyword of uni.keywords) {
//       if (textLower.includes(keyword.toLowerCase())) {
//         return uni.name;
//       }
//     }
//   }
  
//   return "Unknown University";
// }

// /**
//  * Calculate totals and statistics
//  */
// function calculateStats(courses) {
//   if (!courses || courses.length === 0) {
//     return {
//       totalCourses: 0,
//       totalCredits: 0,
//       averageGrade: 0,
//       weightedGPA: 0,
//     };
//   }
  
//   const totalCredits = courses.reduce((sum, c) => sum + (c.usCredits || c.credits || 3), 0);
//   const gradeNumValues = courses
//     .map((c) => {
//       const gradeStr = c.grade.replace("%", "");
//       return parseFloat(gradeStr);
//     })
//     .filter((g) => !isNaN(g));
  
//   const averageGrade = gradeNumValues.length > 0 
//     ? (gradeNumValues.reduce((a, b) => a + b, 0) / gradeNumValues.length).toFixed(2)
//     : 0;
  
//   // Calculate weighted GPA using the converted GPAs
//   const weightedGPA = calculateWeightedGPA(courses);
  
//   return {
//     totalCourses: courses.length,
//     totalCredits,
//     averageGrade,
//     weightedGPA: parseFloat(weightedGPA.toFixed(2)),
//   };
// }

// module.exports = {
//   parseTranscriptText,
//   detectUniversity,
//   calculateStats,
// };