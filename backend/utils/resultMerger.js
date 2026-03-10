/**
 * Merges results from text-based and vision-based parsers.
 * Strategy: take the best of both worlds.
 * - Use text result as the base (more reliable titles from layout extraction)
 * - Fill in missing grades from vision result
 * - Add any courses vision found that text missed
 * - Score and report which source was more useful
 */

function mergeParsedResults(textCourses, visionCourses) {
  if (!textCourses || textCourses.length === 0) return { courses: visionCourses || [], source: "vision" };
  if (!visionCourses || visionCourses.length === 0) return { courses: textCourses, source: "text" };

  const merged = [];
  const usedVisionIdx = new Set();

  // For each text course, see if vision has a better grade
  for (const tc of textCourses) {
    const vMatch = findBestMatch(tc.title, visionCourses, usedVisionIdx);
    if (vMatch) {
      usedVisionIdx.add(vMatch.idx);
      // Prefer non-missing grade; if both have grades, prefer text (cleaner titles)
      const grade = (tc.grade && tc.grade !== "") ? tc.grade
                  : (vMatch.course.grade && vMatch.course.grade !== "") ? vMatch.course.grade
                  : "";
      merged.push({ ...tc, grade, ...reGrade(grade, tc.gradeScaleType) });
    } else {
      merged.push(tc);
    }
  }

  // Add vision-only courses that text missed
  let visionOnlyCount = 0;
  for (let i = 0; i < visionCourses.length; i++) {
    if (!usedVisionIdx.has(i)) {
      const vc = visionCourses[i];
      // Only add if it looks like a real course (not a fragment)
      if (vc.title && vc.title.length > 8 && vc.title.split(" ").length >= 2) {
        merged.push(vc);
        visionOnlyCount++;
      }
    }
  }

  // Re-number codes
  merged.forEach((c, i) => { c.code = `SUB${String(i+1).padStart(3,"0")}`; });

  const textGrades   = textCourses.filter(c => c.grade).length;
  const visionGrades = visionCourses.filter(c => c.grade).length;
  const source = visionOnlyCount > 0
    ? `text+vision (vision added ${visionOnlyCount} courses)`
    : visionGrades > textGrades
    ? `text+vision (vision fixed ${visionGrades - textGrades} grades)`
    : "text (vision confirmed)";

  return { courses: merged, source };
}

function findBestMatch(title, candidates, usedIdx) {
  const t = title.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  let best = null;
  let bestScore = 0.5; // minimum threshold

  candidates.forEach((c, idx) => {
    if (usedIdx.has(idx)) return;
    const ct = c.title.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    const score = similarity(t, ct);
    if (score > bestScore) {
      bestScore = score;
      best = { course: c, idx, score };
    }
  });
  return best;
}

function similarity(a, b) {
  if (a === b) return 1.0;
  // Check if one contains the other (handles truncation)
  if (a.includes(b) || b.includes(a)) return 0.9;
  // Word overlap score
  const wa = new Set(a.split(" ").filter(w => w.length > 3));
  const wb = new Set(b.split(" ").filter(w => w.length > 3));
  const intersection = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 ? intersection / union : 0;
}

function reGrade(grade, scaleType) {
  // Re-run conversion with the (possibly updated) grade
  if (!grade) return { convertedGPA: 0, usGrade: "N/A" };
  const { convertGrade } = require("./aiParser");
  const { gpa, letter } = convertGrade(grade, scaleType);
  return { convertedGPA: gpa, usGrade: letter };
}

module.exports = { mergeParsedResults };
