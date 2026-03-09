const { convertPercentageToGPA, convertGPAToLetterGrade, processCoursesWithGPA } = require("./utils/gpaConverter");

// Test the GPA conversion logic
console.log("Testing WES GPA Conversion Logic");
console.log("=================================");

// Test percentage to GPA conversion
console.log("\n1. Percentage to GPA Conversion:");
const testPercentages = [95, 87, 78, 65, 45];
testPercentages.forEach(percent => {
  const gpa = convertPercentageToGPA(percent);
  const letter = convertGPAToLetterGrade(gpa);
  console.log(`${percent}% → ${gpa} GPA → ${letter} Grade`);
});

// Test course processing
console.log("\n2. Course Processing with GPA Conversion:");
const sampleCourses = [
  { code: "CS301", title: "Data Structures", grade: "87%", credits: 4 },
  { code: "MA201", title: "Engineering Mathematics", grade: "91%", credits: 4 },
  { code: "CS302", title: "Operating Systems", grade: "78%", credits: 3 },
  { code: "EC201", title: "Basic Electronics", grade: "83%", credits: 3 },
];

const processedCourses = processCoursesWithGPA(sampleCourses, "IIT Bombay");
processedCourses.forEach(course => {
  console.log(`${course.code}: ${course.grade} → ${course.convertedGPA} GPA (${course.usGrade})`);
});

// Calculate weighted GPA
const totalCredits = processedCourses.reduce((sum, c) => sum + c.usCredits, 0);
const weightedGPA = processedCourses.reduce((sum, c) => sum + c.convertedGPA * c.usCredits, 0) / totalCredits;

console.log(`\n3. Weighted GPA Calculation:`);
console.log(`Total Credits: ${totalCredits}`);
console.log(`Weighted GPA: ${weightedGPA.toFixed(2)}`);

console.log("\n✅ GPA Conversion Logic Test Complete!");
