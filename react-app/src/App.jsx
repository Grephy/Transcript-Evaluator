import React, { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";

const STEPS = ["Upload", "Processing", "Review", "Download"];

const SAMPLE_COURSES = [
  { code: "CS301", title: "Data Structures and Algorithms", credits: 4, grade: "87%", usGrade: "B+", usCredits: 3.0, gpa: 3.3 },
  { code: "MA201", title: "Engineering Mathematics II", credits: 4, grade: "91%", usGrade: "A-", usCredits: 3.0, gpa: 3.7 },
  { code: "CS302", title: "Operating Systems", credits: 3, grade: "78%", usGrade: "B", usCredits: 3.0, gpa: 3.0 },
  { code: "EC201", title: "Basic Electronics", credits: 3, grade: "83%", usGrade: "B+", usCredits: 3.0, gpa: 3.3 },
  { code: "CS303", title: "Database Management Systems", credits: 4, grade: "94%", usGrade: "A", usCredits: 3.0, gpa: 4.0 },
  { code: "CS304", title: "Computer Networks", credits: 3, grade: "80%", usGrade: "B", usCredits: 3.0, gpa: 3.0 },
];

const FEATURES = [
  { icon: "⚡", title: "Instant Extraction", desc: "AI-powered OCR reads PDFs, images, and scanned documents in seconds" },
  { icon: "🎓", title: "500+ University Formats", desc: "Recognizes grading systems from IITs, NITs, VTU, Mumbai, Anna, and more" },
  { icon: "📊", title: "WES-Standard Output", desc: "Output formatted exactly to World Education Services requirements" },
  { icon: "🔄", title: "Smart GPA Conversion", desc: "Percentage → GPA mapping using official WES conversion tables" },
  { icon: "📋", title: "Credit Normalization", desc: "Converts variable credit systems to standard US semester hours" },
  { icon: "🔒", title: "Bank-grade Security", desc: "Your transcripts are encrypted and never stored after processing" },
];

const UNIVERSITIES = ["IIT Bombay", "Delhi University", "VTU", "Anna University", "Mumbai University", "JNTU", "Pune University", "Osmania University"];

function AnimatedCounter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function StepIndicator({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 40 }}>
      {STEPS.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: i < current ? "#00C896" : i === current ? "#fff" : "transparent",
              border: `2px solid ${i <= current ? "#00C896" : "#333"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: i < current ? "#0a0a0a" : i === current ? "#0a0a0a" : "#555",
              fontSize: 14, fontWeight: 700,
              transition: "all 0.3s ease",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i === current ? "#00C896" : "#555", fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
              {step.toUpperCase()}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              width: 80, height: 2, marginBottom: 22,
              background: i < current ? "#00C896" : "#222",
              transition: "background 0.3s ease"
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function UploadZone({ uploadFile }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); }
  };

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "#00C896" : file ? "#00C896" : "#333"}`,
          borderRadius: 16,
          padding: "60px 40px",
          cursor: "pointer",
          background: dragging ? "rgba(0,200,150,0.05)" : file ? "rgba(0,200,150,0.03)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s ease",
          marginBottom: 24,
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.txt" onChange={handleChange} style={{ display: "none" }} />
        {file ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ color: "#00C896", fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{file.name}</div>
            <div style={{ color: "#555", fontSize: 13, marginTop: 8 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.6 }}>📄</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Drop your transcript here</div>
            <div style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>or click to browse files</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {["PDF", "JPG/PNG", "CSV/XLSX", "TXT"].map(f => (
                <span key={f} style={{
                  padding: "4px 12px", borderRadius: 20,
                  border: "1px solid #333", color: "#555",
                  fontSize: 12, fontFamily: "'DM Mono', monospace"
                }}>{f}</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "#444", fontSize: 12, marginBottom: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>OR SELECT YOUR UNIVERSITY</div>
        <select style={{
          background: "#111", border: "1px solid #333", color: "#fff",
          padding: "12px 16px", borderRadius: 10, fontSize: 14, width: "100%",
          fontFamily: "'DM Mono', monospace", outline: "none", cursor: "pointer"
        }}>
          <option value="">Auto-detect from transcript...</option>
          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <button
        onClick={() => file && uploadFile(file)}
        style={{
          width: "100%", padding: "16px", borderRadius: 12,
          background: file ? "linear-gradient(135deg, #00C896, #00A878)" : "#1a1a1a",
          border: "none", color: file ? "#0a0a0a" : "#444",
          fontSize: 16, fontWeight: 700, cursor: file ? "pointer" : "not-allowed",
          fontFamily: "'DM Mono', monospace", letterSpacing: 1,
          transition: "all 0.2s ease",
        }}
      >
        {file ? "PROCESS TRANSCRIPT →" : "SELECT A FILE TO CONTINUE"}
      </button>
    </div>
  );
}

function ProcessingView({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);

  const phases = [
    "Extracting text with OCR...",
    "Identifying university format...",
    "Mapping course titles...",
    "Converting grading scale...",
    "Normalizing credit hours...",
    "Generating WES report...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + 1.8;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onDone, 600);
          return 100;
        }
        setPhase(Math.floor((next / 100) * phases.length));
        return next;
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 32px" }}>
        <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1a1a" strokeWidth="6" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="#00C896" strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          color: "#00C896", fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace"
        }}>{Math.floor(progress)}%</div>
      </div>

      <div style={{ color: "#fff", fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Analyzing Transcript</div>
      <div style={{
        color: "#00C896", fontSize: 13, fontFamily: "'DM Mono', monospace",
        letterSpacing: 1, marginBottom: 32, minHeight: 20
      }}>
        {phases[Math.min(phase, phases.length - 1)]}
      </div>

      <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 20, textAlign: "left" }}>
        {phases.slice(0, Math.min(phase + 1, phases.length)).map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            color: i < phase ? "#555" : "#00C896",
            fontSize: 13, fontFamily: "'DM Mono', monospace",
            padding: "6px 0", borderBottom: i < phases.length - 1 ? "1px solid #1a1a1a" : "none"
          }}>
            <span>{i < phase ? "✓" : "▶"}</span>
            <span>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WES Conversion Tables (mirrored from aiParser.js for live recalculation) ──
const WES_SCALES = {
  "10point_letter": {
    label: "Indian 10-Point Letter Scale",
    note: "Used by ABS, NMIMS and similar institutions",
    rows: [
      { orig: "A+", range: "90–100%", wes: "A",  gpa: 4.0 },
      { orig: "A",  range: "80–89%",  wes: "B+", gpa: 3.3 },
      { orig: "B+", range: "70–79%",  wes: "B-", gpa: 2.7 },
      { orig: "B",  range: "60–69%",  wes: "C",  gpa: 2.0 },
      { orig: "C",  range: "50–59%",  wes: "D+", gpa: 1.3 },
      { orig: "D",  range: "40–49%",  wes: "D-", gpa: 0.7 },
      { orig: "E",  range: "< 40%",   wes: "F",  gpa: 0.0 },
    ],
  },
  "10point_numeric": {
    label: "IIT / NIT 10-Point Numeric Scale (CGPA/SPI)",
    note: "Used by IITs, NITs, BITS Pilani",
    rows: [
      { orig: "9.5–10", range: "Outstanding", wes: "A",  gpa: 4.0 },
      { orig: "8.5–9.4", range: "Excellent",  wes: "A-", gpa: 3.7 },
      { orig: "7.5–8.4", range: "Very Good",  wes: "B+", gpa: 3.3 },
      { orig: "6.5–7.4", range: "Good",       wes: "B",  gpa: 3.0 },
      { orig: "5.5–6.4", range: "Average",    wes: "C+", gpa: 2.3 },
      { orig: "4.5–5.4", range: "Pass",       wes: "C-", gpa: 1.7 },
      { orig: "< 4.5",   range: "Fail",       wes: "F",  gpa: 0.0 },
    ],
  },
  "percentage": {
    label: "Percentage Scale",
    note: "Used by VTU, Anna University, Mumbai University, JNTU and most state universities",
    rows: [
      { orig: "90–100%", range: "Outstanding", wes: "A",  gpa: 4.0 },
      { orig: "85–89%",  range: "Excellent",   wes: "A-", gpa: 3.7 },
      { orig: "80–84%",  range: "Very Good",   wes: "B+", gpa: 3.3 },
      { orig: "75–79%",  range: "Good",        wes: "B",  gpa: 3.0 },
      { orig: "70–74%",  range: "Above Avg",   wes: "B-", gpa: 2.7 },
      { orig: "65–69%",  range: "Average",     wes: "C+", gpa: 2.3 },
      { orig: "60–64%",  range: "Pass",        wes: "C",  gpa: 2.0 },
      { orig: "55–59%",  range: "Pass",        wes: "C-", gpa: 1.7 },
      { orig: "50–54%",  range: "Pass",        wes: "D+", gpa: 1.3 },
      { orig: "45–49%",  range: "Pass",        wes: "D",  gpa: 1.0 },
      { orig: "< 45%",   range: "Fail",        wes: "F",  gpa: 0.0 },
    ],
  },
  "us_letter": {
    label: "US Letter Grade Scale",
    note: "Standard US / international scale",
    rows: [
      { orig: "A / A+", range: "93–100%", wes: "A",  gpa: 4.0 },
      { orig: "A-",     range: "90–92%",  wes: "A-", gpa: 3.7 },
      { orig: "B+",     range: "87–89%",  wes: "B+", gpa: 3.3 },
      { orig: "B",      range: "83–86%",  wes: "B",  gpa: 3.0 },
      { orig: "B-",     range: "80–82%",  wes: "B-", gpa: 2.7 },
      { orig: "C+",     range: "77–79%",  wes: "C+", gpa: 2.3 },
      { orig: "C",      range: "73–76%",  wes: "C",  gpa: 2.0 },
      { orig: "D",      range: "60–69%",  wes: "D",  gpa: 1.0 },
      { orig: "F",      range: "< 60%",   wes: "F",  gpa: 0.0 },
    ],
  },
};

function reConvertGrade(grade, scaleType) {
  const scale = WES_SCALES[scaleType];
  if (!scale) return { usGrade: "N/A", convertedGPA: 0 };
  const g = String(grade).trim().toUpperCase().replace("%", "");

  if (scaleType === "10point_letter") {
    const MAP = { "A+": [4.0,"A"], "A": [3.3,"B+"], "B+": [2.7,"B-"], "B": [2.0,"C"], "C": [1.3,"D+"], "D": [0.7,"D-"], "E": [0.0,"F"] };
    const r = MAP[g]; return r ? { convertedGPA: r[0], usGrade: r[1] } : { convertedGPA: 0, usGrade: "N/A" };
  }
  if (scaleType === "us_letter") {
    const MAP = { "A+": [4.0,"A"], "A": [4.0,"A"], "A-": [3.7,"A-"], "B+": [3.3,"B+"], "B": [3.0,"B"], "B-": [2.7,"B-"], "C+": [2.3,"C+"], "C": [2.0,"C"], "C-": [1.7,"C-"], "D+": [1.3,"D+"], "D": [1.0,"D"], "F": [0.0,"F"], "E": [0.0,"F"] };
    const r = MAP[g]; return r ? { convertedGPA: r[0], usGrade: r[1] } : { convertedGPA: 0, usGrade: "N/A" };
  }
  const n = parseFloat(g);
  if (!isNaN(n)) {
    if (scaleType === "10point_numeric") {
      const ROWS = [[9.5,10,4.0,"A"],[8.5,9.4,3.7,"A-"],[7.5,8.4,3.3,"B+"],[6.5,7.4,3.0,"B"],[5.5,6.4,2.3,"C+"],[4.5,5.4,1.7,"C-"],[0,4.4,0.0,"F"]];
      for (const [lo,hi,gpa,lt] of ROWS) if (n >= lo && n <= hi) return { convertedGPA: gpa, usGrade: lt };
    } else {
      const ROWS = [[90,100,4.0,"A"],[85,89,3.7,"A-"],[80,84,3.3,"B+"],[75,79,3.0,"B"],[70,74,2.7,"B-"],[65,69,2.3,"C+"],[60,64,2.0,"C"],[55,59,1.7,"C-"],[50,54,1.3,"D+"],[45,49,1.0,"D"],[0,44,0.0,"F"]];
      for (const [lo,hi,gpa,lt] of ROWS) if (n >= lo && n <= hi) return { convertedGPA: gpa, usGrade: lt };
    }
  }
  return { convertedGPA: 0, usGrade: "N/A" };
}

function isSuspiciousTitle(title) {
  if (!title) return false;
  // Two common course subjects joined — likely OCR merge
  const SUBJECTS = ["management","statistics","behaviour","techniques","marketing","finance","economics","communication","governance","foundations"];
  const words = title.toLowerCase().split(" ");
  let subjectCount = 0;
  for (const w of words) {
    if (SUBJECTS.some(s => w.startsWith(s))) subjectCount++;
  }
  if (subjectCount >= 3) return true;
  // Title too long (merged)
  if (title.length > 60) return true;
  return false;
}

function ReviewView({ onDownload, generatePDF, courses, university }) {
  const scaleType = courses[0]?.gradeScaleType || "10point_letter";
  const scale = WES_SCALES[scaleType] || WES_SCALES["10point_letter"];

  // Editable local copy
  const [rows, setRows] = useState(() =>
    courses.map(c => ({ ...c }))
  );
  const [editingIdx, setEditingIdx] = useState(null);
  const [showFormula, setShowFormula] = useState(false);
  const [editDraft, setEditDraft] = useState({});

  const totalUSCredits = rows.reduce((s, c) => s + (c.usCredits || 3), 0);
  const validRows = rows.filter(c => c.convertedGPA > 0);
  const weightedGPA = validRows.length > 0
    ? validRows.reduce((s, c) => s + c.convertedGPA * (c.usCredits || 3), 0)
      / validRows.reduce((s, c) => s + (c.usCredits || 3), 0)
    : 0;

  const flaggedCount = rows.filter(c => isSuspiciousTitle(c.title) || !c.grade || c.grade === "").length;

  function startEdit(i) {
    setEditDraft({ title: rows[i].title, grade: rows[i].grade, credits: rows[i].usCredits || 3 });
    setEditingIdx(i);
  }

  function saveEdit(i) {
    const updated = [...rows];
    const { gpa, letter } = (() => {
      const r = reConvertGrade(editDraft.grade, scaleType);
      return { gpa: r.convertedGPA, letter: r.usGrade };
    })();
    updated[i] = {
      ...updated[i],
      title: editDraft.title,
      grade: editDraft.grade,
      usCredits: parseFloat(editDraft.credits) || 3,
      convertedGPA: gpa,
      usGrade: letter,
    };
    setRows(updated);
    setEditingIdx(null);
  }

  function deleteRow(i) {
    setRows(rows.filter((_, idx) => idx !== i));
    if (editingIdx === i) setEditingIdx(null);
  }

  function addRow() {
    setRows([...rows, {
      code: `SUB${String(rows.length + 1).padStart(3,"0")}`,
      title: "New Course",
      grade: "",
      usCredits: 3,
      convertedGPA: 0,
      usGrade: "N/A",
      gradeScaleType: scaleType,
    }]);
    setEditingIdx(rows.length);
    setEditDraft({ title: "New Course", grade: "", credits: 3 });
  }

  const gpaColor = (g) => g >= 3.7 ? "#00C896" : g >= 3.0 ? "#FFC800" : g >= 2.0 ? "#FF9F40" : "#FF6464";

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Cumulative GPA", value: weightedGPA.toFixed(2), sub: "on 4.0 scale" },
          { label: "US Credit Hours", value: totalUSCredits, sub: "semester hours" },
          { label: "Courses", value: `${rows.length}${flaggedCount > 0 ? ` (${flaggedCount} ⚠)` : ""}`, sub: flaggedCount > 0 ? "flagged for review" : "all verified" },
        ].map(s => (
          <div key={s.label} style={{ background: "#0f0f0f", borderRadius: 12, padding: 16, textAlign: "center", border: "1px solid #1a1a1a" }}>
            <div style={{ color: "#00C896", fontSize: 26, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
            <div style={{ color: "#fff", fontSize: 11, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            <div style={{ color: "#444", fontSize: 10, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Flag notice */}
      {flaggedCount > 0 && (
        <div style={{ background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.25)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ color: "#FFC800", fontSize: 13 }}>
            <strong>{flaggedCount} course{flaggedCount > 1 ? "s" : ""}</strong> may need review — titles look merged or grades are missing. Click the ✎ icon to edit.
          </span>
        </div>
      )}

      {/* WES Formula toggle */}
      <button
        onClick={() => setShowFormula(f => !f)}
        style={{ background: "transparent", border: "1px solid #222", borderRadius: 8, color: "#666", fontSize: 12, padding: "7px 14px", cursor: "pointer", marginBottom: 12, fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}
      >
        <span>{showFormula ? "▾" : "▸"}</span> WES CONVERSION FORMULA — {scale.label}
      </button>

      {showFormula && (
        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ color: "#666", fontSize: 11, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>{scale.note}</div>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 60px", gap: "4px 12px", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
            <span style={{ color: "#444" }}>ORIG GRADE</span>
            <span style={{ color: "#444" }}>% RANGE</span>
            <span style={{ color: "#444" }}>US GRADE</span>
            <span style={{ color: "#444" }}>GPA PTS</span>
            {scale.rows.map(r => (
              <React.Fragment key={r.orig}>
                <span style={{ color: "#fff", fontWeight: 700 }}>{r.orig}</span>
                <span style={{ color: "#555" }}>{r.range}</span>
                <span style={{ color: "#00C896" }}>{r.wes}</span>
                <span style={{ color: "#00C896" }}>{r.gpa.toFixed(1)}</span>
              </React.Fragment>
            ))}
          </div>
          <div style={{ color: "#333", fontSize: 10, marginTop: 12, fontFamily: "'DM Mono', monospace" }}>
            Formula: Cumulative GPA = Σ(GPA × Credits) ÷ Σ(Credits)
          </div>
        </div>
      )}

      {/* Course table */}
      <div style={{ background: "#0f0f0f", borderRadius: 12, overflow: "hidden", border: "1px solid #1a1a1a", marginBottom: 16 }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 52px 72px 64px 60px", padding: "10px 16px", background: "#141414", color: "#444", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1, borderBottom: "1px solid #1a1a1a" }}>
          <span>COURSE TITLE</span>
          <span style={{ textAlign: "center" }}>GRADE</span>
          <span style={{ textAlign: "center" }}>CR</span>
          <span style={{ textAlign: "center" }}>US GRADE</span>
          <span style={{ textAlign: "center" }}>GPA</span>
          <span style={{ textAlign: "center" }}>EDIT</span>
        </div>

        {rows.map((c, i) => {
          const suspicious = isSuspiciousTitle(c.title) || !c.grade;
          const isEditing = editingIdx === i;
          const gpa = c.convertedGPA || 0;

          return (
            <div key={c.code + i} style={{
              borderBottom: i < rows.length - 1 ? "1px solid #141414" : "none",
              background: suspicious ? "rgba(255,180,0,0.04)" : "transparent",
              borderLeft: suspicious ? "3px solid rgba(255,180,0,0.4)" : "3px solid transparent",
            }}>
              {isEditing ? (
                /* Edit mode */
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#444", fontSize: 11, width: 60, fontFamily: "'DM Mono', monospace" }}>TITLE</span>
                    <input
                      value={editDraft.title}
                      onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                      style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 13, fontFamily: "inherit" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#444", fontSize: 11, width: 60, fontFamily: "'DM Mono', monospace" }}>GRADE</span>
                    <input
                      value={editDraft.grade}
                      onChange={e => setEditDraft(d => ({ ...d, grade: e.target.value.toUpperCase() }))}
                      placeholder="e.g. B, A+, 78"
                      style={{ width: 80, background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center" }}
                    />
                    <span style={{ color: "#444", fontSize: 11, marginLeft: 16, fontFamily: "'DM Mono', monospace" }}>CREDITS</span>
                    <input
                      type="number"
                      value={editDraft.credits}
                      onChange={e => setEditDraft(d => ({ ...d, credits: e.target.value }))}
                      style={{ width: 60, background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center" }}
                    />
                    {editDraft.grade && (
                      <span style={{ color: "#00C896", fontSize: 12, fontFamily: "'DM Mono', monospace", marginLeft: 8 }}>
                        → {reConvertGrade(editDraft.grade, scaleType).usGrade} ({reConvertGrade(editDraft.grade, scaleType).convertedGPA.toFixed(1)})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditingIdx(null)} style={{ padding: "5px 14px", borderRadius: 6, background: "transparent", border: "1px solid #333", color: "#666", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    <button onClick={() => deleteRow(i)} style={{ padding: "5px 14px", borderRadius: 6, background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6464", fontSize: 12, cursor: "pointer" }}>Delete</button>
                    <button onClick={() => saveEdit(i)} style={{ padding: "5px 14px", borderRadius: 6, background: "rgba(0,200,150,0.15)", border: "1px solid #00C896", color: "#00C896", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Save</button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 52px 72px 64px 60px", padding: "11px 16px", alignItems: "center" }}>
                  <div>
                    <div style={{ color: suspicious ? "#FFC800" : "#fff", fontSize: 13, fontWeight: 500 }}>
                      {suspicious && <span style={{ marginRight: 6 }}>⚠</span>}
                      {c.title}
                    </div>
                    <div style={{ color: "#333", fontSize: 10, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{c.code}</div>
                  </div>
                  <div style={{ textAlign: "center", color: "#666", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{c.grade || "—"}</div>
                  <div style={{ textAlign: "center", color: "#fff", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{c.usCredits || 3}</div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, background: `${gpaColor(gpa)}18`, color: gpaColor(gpa), fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
                      {c.usGrade || "N/A"}
                    </span>
                  </div>
                  <div style={{ textAlign: "center", color: gpaColor(gpa), fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{gpa > 0 ? gpa.toFixed(1) : "—"}</div>
                  <div style={{ textAlign: "center" }}>
                    <button onClick={() => startEdit(i)} style={{ background: "transparent", border: "none", color: suspicious ? "#FFC800" : "#444", cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 4, lineHeight: 1 }}>✎</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add course */}
      <button onClick={addRow} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "transparent", border: "1px dashed #222", color: "#444", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
        + ADD MISSING COURSE
      </button>

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button
          onClick={() => { generatePDF(rows); onDownload(); }}
          style={{ padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #00C896, #00A878)", border: "none", color: "#0a0a0a", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}
        >⬇ DOWNLOAD PDF</button>
        <button
          onClick={() => { generatePDF(rows); }}
          style={{ padding: "14px", borderRadius: 10, background: "transparent", border: "1px solid #333", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
        >⬇ DOWNLOAD (EDITED)</button>
      </div>
    </div>
  );
}

function DownloadView({ onReset }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(0,200,150,0.1)", border: "2px solid #00C896",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, margin: "0 auto 24px"
      }}>✓</div>
      <h3 style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Transcript Ready!</h3>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Your WES-format transcript has been generated and downloaded.</p>

      <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 20, marginBottom: 24, textAlign: "left" }}>
        <div style={{ color: "#444", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 12 }}>WHAT'S INCLUDED</div>
        {[
          "✓  WES-format PDF transcript",
          "✓  GPA conversion report",
          "✓  Credit hour mapping table",
          "✓  Course title translations",
          "✓  Grading scale reference",
        ].map(item => (
          <div key={item} style={{ color: "#ccc", fontSize: 13, padding: "6px 0", fontFamily: "'DM Mono', monospace" }}>{item}</div>
        ))}
      </div>

      <button onClick={onReset} style={{
        width: "100%", padding: "14px", borderRadius: 10, background: "transparent",
        border: "1px solid #333", color: "#fff", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "'DM Mono', monospace"
      }}>PROCESS ANOTHER TRANSCRIPT</button>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [activeTab, setActiveTab] = useState("tool");
  const [courses, setCourses] = useState(SAMPLE_COURSES);
  const [university, setUniversity] = useState("Unknown");
  const [isProcessing, setIsProcessing] = useState(false);
  const toolRef = useRef(null);

  const scrollToTool = () => {
    toolRef.current?.scrollIntoView({ behavior: "smooth" });
    setActiveTab("tool");
  };

  const reset = () => {
    setStep(0);
    setCourses(SAMPLE_COURSES);
    setUniversity("Unknown");
  };

  const uploadFile = async (file) => {
    try {
      setIsProcessing(true);
      console.log("Starting upload for file:", file.name, "size:", file.size);

      const formData = new FormData();
      formData.append("file", file);

      console.log("Making fetch request to backend...");
      const response = await fetch("http://localhost:5001/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status, response.statusText);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errMsg = `${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          errMsg = errData.message || errData.error || errMsg;
          if (errData.hint) errMsg += `\n\nHint: ${errData.hint}`;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success && data.data.courses.length > 0) {
        setCourses(data.data.courses);
        setUniversity(data.data.university);
        console.log("Extracted courses:", data.data.courses);
        setStep(1);
      } else {
        // Show raw OCR text for debugging
        const preview = data.data?.extractedTextPreview || "";
        console.error("=== RAW OCR OUTPUT ===\n", preview);
        alert(
          "Could not extract courses from this file.\n\n" +
          "RAW OCR TEXT (first 400 chars):\n" +
          "─────────────────────────\n" +
          (preview ? preview : "(OCR returned empty — check server logs)") +
          "\n─────────────────────────\n\n" +
          "Share this text so the parser can be fixed for your transcript format."
        );
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error processing file: " + error.message);
      setIsProcessing(false);
    }
  };

  const generatePDF = (coursesToExport = courses) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Set font for title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("WES International Credential Evaluation", margin, yPosition);

    // Add header info
    yPosition += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Date Generated: " + new Date().toLocaleDateString(), margin, yPosition);
    yPosition += 8;
    doc.text("Format: WES Standard Transcript Report", margin, yPosition);
    yPosition += 6;
    const scaleUsed = coursesToExport[0]?.gradeScaleType || "unknown";
    doc.text("Grade Scale: " + scaleUsed, margin, yPosition);

    // Add GPA section
    yPosition += 12;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Summary", margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const totalUSCredits = coursesToExport.reduce((s, c) => s + (c.usCredits || c.credits || 3), 0);
    const weightedGPA = coursesToExport.reduce((s, c) => s + (c.convertedGPA || c.gpa || 0) * (c.usCredits || c.credits || 3), 0) / totalUSCredits;
    
    doc.text("Cumulative GPA (4.0 scale): " + weightedGPA.toFixed(2), margin + 5, yPosition);
    yPosition += 6;
    doc.text("Total US Credit Hours: " + totalUSCredits, margin + 5, yPosition);
    yPosition += 6;
    doc.text("Total Courses: " + coursesToExport.length, margin + 5, yPosition);

    // Add courses table
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Course Details", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Code", margin, yPosition);
    doc.text("Title", margin + 20, yPosition);
    doc.text("Grade", margin + 100, yPosition);
    doc.text("US Grade", margin + 120, yPosition);
    doc.text("US Cr", margin + 150, yPosition);
    doc.text("GPA", margin + 170, yPosition);

    yPosition += 7;
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);

    coursesToExport.forEach((course, index) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(course.code, margin, yPosition);
      doc.text((course.title || "").substring(0, 45), margin + 20, yPosition);
      doc.text(course.grade, margin + 100, yPosition);
      doc.text(course.usGrade || "N/A", margin + 120, yPosition);
      doc.text(course.usCredits.toString(), margin + 150, yPosition);
      doc.text((course.convertedGPA || course.gpa || 0).toFixed(1), margin + 170, yPosition);
      yPosition += 6;
    });

    // Save the PDF
    doc.save("TranscriptIQ_WES_Report.pdf");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }

        .nav-link { 
          color: #555; text-decoration: none; font-size: 14px; 
          transition: color 0.2s; cursor: pointer;
        }
        .nav-link:hover { color: #fff; }
        
        .feature-card {
          background: #0f0f0f;
          border: 1px solid #1a1a1a;
          border-radius: 16px;
          padding: 28px;
          transition: all 0.2s ease;
        }
        .feature-card:hover {
          border-color: #2a2a2a;
          background: #111;
          transform: translateY(-2px);
        }

        .stat-card {
          text-align: center;
          padding: 20px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.6s ease forwards; }
        .fade-up-delay-1 { animation: fade-up 0.6s ease 0.1s forwards; opacity: 0; }
        .fade-up-delay-2 { animation: fade-up 0.6s ease 0.2s forwards; opacity: 0; }
        .fade-up-delay-3 { animation: fade-up 0.6s ease 0.3s forwards; opacity: 0; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 40px",
        background: "rgba(10,10,10,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #111",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #00C896, #00856A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16
          }}>📑</div>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>
            TranscriptIQ
          </span>
        </div>

        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["Features", "How It Works", "Pricing"].map(l => (
            <span key={l} className="nav-link">{l}</span>
          ))}
          <button onClick={scrollToTool} style={{
            padding: "9px 20px", borderRadius: 8,
            background: "linear-gradient(135deg, #00C896, #00A878)",
            border: "none", color: "#0a0a0a",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Mono', monospace", letterSpacing: 0.5
          }}>TRY FREE →</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        paddingTop: 140, paddingBottom: 100,
        textAlign: "center",
        maxWidth: 900, margin: "0 auto",
        padding: "140px 24px 100px",
        position: "relative",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse, rgba(0,200,150,0.06) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        <div className="fade-up" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)",
          borderRadius: 20, padding: "6px 16px", marginBottom: 28,
          color: "#00C896", fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C896", display: "inline-block" }} />
          WES-COMPATIBLE · INSTANT CONVERSION · FREE TO TRY
        </div>

        <h1 className="fade-up-delay-1" style={{
          fontSize: "clamp(42px, 7vw, 72px)",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800, lineHeight: 1.05,
          letterSpacing: -2, marginBottom: 24,
        }}>
          Stop converting<br />
          <span style={{ color: "#00C896" }}>transcripts manually.</span>
        </h1>

        <p className="fade-up-delay-2" style={{
          fontSize: 18, color: "#555", lineHeight: 1.7,
          maxWidth: 560, margin: "0 auto 40px",
        }}>
          Upload your Indian university transcript. Get a WES-standard normalized report with GPA conversion, credit mapping, and course translations — in under 60 seconds.
        </p>

        <div className="fade-up-delay-3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={scrollToTool} style={{
            padding: "15px 32px", borderRadius: 12,
            background: "linear-gradient(135deg, #00C896, #00A878)",
            border: "none", color: "#0a0a0a",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
          }}>
            Convert My Transcript →
          </button>
          <button style={{
            padding: "15px 32px", borderRadius: 12,
            background: "transparent", border: "1px solid #222",
            color: "#fff", fontSize: 15, cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
          }}>
            See Sample Output
          </button>
        </div>
      </section>

      {/* STATS */}
      <section style={{
        borderTop: "1px solid #111", borderBottom: "1px solid #111",
        padding: "48px 24px",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0
        }}>
          {[
            { n: 15000, s: "+", label: "Transcripts Processed" },
            { n: 500, s: "+", label: "University Formats" },
            { n: 99, s: "%", label: "Accuracy Rate" },
            { n: 45, s: "sec", label: "Avg. Processing Time" },
          ].map((s, i) => (
            <div key={s.label} className="stat-card" style={{
              borderRight: i < 3 ? "1px solid #111" : "none"
            }}>
              <div style={{
                fontSize: 36, fontWeight: 800, fontFamily: "'Syne', sans-serif",
                color: "#fff", marginBottom: 6
              }}>
                <AnimatedCounter target={s.n} suffix={s.s} />
              </div>
              <div style={{ color: "#444", fontSize: 13 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TOOL SECTION */}
      <section ref={toolRef} style={{ padding: "100px 24px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{
            fontSize: 38, fontFamily: "'Syne', sans-serif",
            fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
          }}>Try it now — free</h2>
          <p style={{ color: "#555", fontSize: 16 }}>No signup required. Upload, convert, download.</p>
        </div>

        <div style={{
          background: "#0d0d0d",
          border: "1px solid #1a1a1a",
          borderRadius: 20,
          padding: "48px 40px",
        }}>
          <StepIndicator current={step} />

          {step === 0 && <UploadZone uploadFile={uploadFile} />}
          {step === 1 && <ProcessingView onDone={() => setStep(2)} />}
          {step === 2 && <ReviewView onDownload={() => setStep(3)} generatePDF={generatePDF} courses={courses} university={university} />}
          {step === 3 && <DownloadView onReset={reset} />}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{
            fontSize: 38, fontFamily: "'Syne', sans-serif",
            fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
          }}>Everything you need</h2>
          <p style={{ color: "#555", fontSize: 16 }}>Built specifically for students applying to US and Canadian universities</p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20
        }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{
                fontSize: 17, fontWeight: 700, fontFamily: "'Syne', sans-serif",
                marginBottom: 10, letterSpacing: -0.3
              }}>{f.title}</h3>
              <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{
        padding: "80px 24px",
        borderTop: "1px solid #111",
        maxWidth: 900, margin: "0 auto"
      }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{
            fontSize: 38, fontFamily: "'Syne', sans-serif",
            fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
          }}>How it works</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, position: "relative" }}>
          {[
            { n: "01", title: "Upload", desc: "Drop your transcript in any format — PDF, image, CSV" },
            { n: "02", title: "Extract", desc: "AI reads all courses, grades, and credit hours" },
            { n: "03", title: "Convert", desc: "We apply WES grading tables and normalize credits" },
            { n: "04", title: "Download", desc: "Get a polished WES-format PDF, ready to submit" },
          ].map((s, i) => (
            <div key={s.n} style={{
              padding: "0 20px", textAlign: "center",
              borderRight: i < 3 ? "1px solid #1a1a1a" : "none"
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#00C896", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
                margin: "0 auto 20px"
              }}>{s.n}</div>
              <h3 style={{
                fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif",
                marginBottom: 10
              }}>{s.title}</h3>
              <p style={{ color: "#444", fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "100px 24px", textAlign: "center",
        borderTop: "1px solid #111",
      }}>
        <div style={{
          maxWidth: 600, margin: "0 auto",
          background: "linear-gradient(135deg, rgba(0,200,150,0.05), rgba(0,168,120,0.02))",
          border: "1px solid rgba(0,200,150,0.1)",
          borderRadius: 24, padding: "60px 48px"
        }}>
          <h2 style={{
            fontSize: 40, fontFamily: "'Syne', sans-serif",
            fontWeight: 800, letterSpacing: -1.5, marginBottom: 16
          }}>Ready to get started?</h2>
          <p style={{ color: "#555", fontSize: 16, marginBottom: 36 }}>
            Join thousands of students who have simplified their WES application process.
          </p>
          <button onClick={scrollToTool} style={{
            padding: "16px 40px", borderRadius: 12,
            background: "linear-gradient(135deg, #00C896, #00A878)",
            border: "none", color: "#0a0a0a",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
          }}>
            Convert Transcript Free →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #111",
        padding: "40px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1100, margin: "0 auto",
        flexWrap: "wrap", gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "linear-gradient(135deg, #00C896, #00856A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12
          }}>📑</div>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>TranscriptIQ</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <span key={l} className="nav-link" style={{ fontSize: 13 }}>{l}</span>
          ))}
        </div>
        <div style={{ color: "#333", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
          © 2025 TranscriptIQ
        </div>
      </footer>
    </div>
  );
}


// import { useState, useRef, useEffect } from "react";
// import jsPDF from "jspdf";

// const STEPS = ["Upload", "Processing", "Review", "Download"];

// const SAMPLE_COURSES = [
//   { code: "CS301", title: "Data Structures and Algorithms", credits: 4, grade: "87%", usGrade: "B+", usCredits: 3.0, gpa: 3.3 },
//   { code: "MA201", title: "Engineering Mathematics II", credits: 4, grade: "91%", usGrade: "A-", usCredits: 3.0, gpa: 3.7 },
//   { code: "CS302", title: "Operating Systems", credits: 3, grade: "78%", usGrade: "B", usCredits: 3.0, gpa: 3.0 },
//   { code: "EC201", title: "Basic Electronics", credits: 3, grade: "83%", usGrade: "B+", usCredits: 3.0, gpa: 3.3 },
//   { code: "CS303", title: "Database Management Systems", credits: 4, grade: "94%", usGrade: "A", usCredits: 3.0, gpa: 4.0 },
//   { code: "CS304", title: "Computer Networks", credits: 3, grade: "80%", usGrade: "B", usCredits: 3.0, gpa: 3.0 },
// ];

// const FEATURES = [
//   { icon: "⚡", title: "Instant Extraction", desc: "AI-powered OCR reads PDFs, images, and scanned documents in seconds" },
//   { icon: "🎓", title: "500+ University Formats", desc: "Recognizes grading systems from IITs, NITs, VTU, Mumbai, Anna, and more" },
//   { icon: "📊", title: "WES-Standard Output", desc: "Output formatted exactly to World Education Services requirements" },
//   { icon: "🔄", title: "Smart GPA Conversion", desc: "Percentage → GPA mapping using official WES conversion tables" },
//   { icon: "📋", title: "Credit Normalization", desc: "Converts variable credit systems to standard US semester hours" },
//   { icon: "🔒", title: "Bank-grade Security", desc: "Your transcripts are encrypted and never stored after processing" },
// ];

// const UNIVERSITIES = ["IIT Bombay", "Delhi University", "VTU", "Anna University", "Mumbai University", "JNTU", "Pune University", "Osmania University"];

// function AnimatedCounter({ target, suffix = "" }) {
//   const [count, setCount] = useState(0);
//   const ref = useRef(null);
//   const started = useRef(false);

//   useEffect(() => {
//     const observer = new IntersectionObserver(([entry]) => {
//       if (entry.isIntersecting && !started.current) {
//         started.current = true;
//         let start = 0;
//         const step = target / 60;
//         const timer = setInterval(() => {
//           start += step;
//           if (start >= target) { setCount(target); clearInterval(timer); }
//           else setCount(Math.floor(start));
//         }, 16);
//       }
//     });
//     if (ref.current) observer.observe(ref.current);
//     return () => observer.disconnect();
//   }, [target]);

//   return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
// }

// function StepIndicator({ current }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 40 }}>
//       {STEPS.map((step, i) => (
//         <div key={step} style={{ display: "flex", alignItems: "center" }}>
//           <div style={{
//             display: "flex", flexDirection: "column", alignItems: "center", gap: 6
//           }}>
//             <div style={{
//               width: 36, height: 36, borderRadius: "50%",
//               background: i < current ? "#00C896" : i === current ? "#fff" : "transparent",
//               border: `2px solid ${i <= current ? "#00C896" : "#333"}`,
//               display: "flex", alignItems: "center", justifyContent: "center",
//               color: i < current ? "#0a0a0a" : i === current ? "#0a0a0a" : "#555",
//               fontSize: 14, fontWeight: 700,
//               transition: "all 0.3s ease",
//             }}>
//               {i < current ? "✓" : i + 1}
//             </div>
//             <span style={{ fontSize: 11, color: i === current ? "#00C896" : "#555", fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
//               {step.toUpperCase()}
//             </span>
//           </div>
//           {i < STEPS.length - 1 && (
//             <div style={{
//               width: 80, height: 2, marginBottom: 22,
//               background: i < current ? "#00C896" : "#222",
//               transition: "background 0.3s ease"
//             }} />
//           )}
//         </div>
//       ))}
//     </div>
//   );
// }

// function UploadZone({ uploadFile }) {
//   const [dragging, setDragging] = useState(false);
//   const [file, setFile] = useState(null);
//   const inputRef = useRef();

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setDragging(false);
//     const f = e.dataTransfer.files[0];
//     if (f) { setFile(f); }
//   };

//   const handleChange = (e) => {
//     const f = e.target.files[0];
//     if (f) setFile(f);
//   };

//   return (
//     <div style={{ textAlign: "center" }}>
//       <div
//         onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
//         onDragLeave={() => setDragging(false)}
//         onDrop={handleDrop}
//         onClick={() => inputRef.current.click()}
//         style={{
//           border: `2px dashed ${dragging ? "#00C896" : file ? "#00C896" : "#333"}`,
//           borderRadius: 16,
//           padding: "60px 40px",
//           cursor: "pointer",
//           background: dragging ? "rgba(0,200,150,0.05)" : file ? "rgba(0,200,150,0.03)" : "rgba(255,255,255,0.02)",
//           transition: "all 0.2s ease",
//           marginBottom: 24,
//         }}
//       >
//         <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.txt" onChange={handleChange} style={{ display: "none" }} />
//         {file ? (
//           <>
//             <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
//             <div style={{ color: "#00C896", fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{file.name}</div>
//             <div style={{ color: "#555", fontSize: 13, marginTop: 8 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
//           </>
//         ) : (
//           <>
//             <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.6 }}>📄</div>
//             <div style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Drop your transcript here</div>
//             <div style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>or click to browse files</div>
//             <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
//               {["PDF", "JPG/PNG", "CSV/XLSX", "TXT"].map(f => (
//                 <span key={f} style={{
//                   padding: "4px 12px", borderRadius: 20,
//                   border: "1px solid #333", color: "#555",
//                   fontSize: 12, fontFamily: "'DM Mono', monospace"
//                 }}>{f}</span>
//               ))}
//             </div>
//           </>
//         )}
//       </div>

//       <div style={{ marginBottom: 24 }}>
//         <div style={{ color: "#444", fontSize: 12, marginBottom: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>OR SELECT YOUR UNIVERSITY</div>
//         <select style={{
//           background: "#111", border: "1px solid #333", color: "#fff",
//           padding: "12px 16px", borderRadius: 10, fontSize: 14, width: "100%",
//           fontFamily: "'DM Mono', monospace", outline: "none", cursor: "pointer"
//         }}>
//           <option value="">Auto-detect from transcript...</option>
//           {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
//         </select>
//       </div>

//       <button
//         onClick={() => file && uploadFile(file)}
//         style={{
//           width: "100%", padding: "16px", borderRadius: 12,
//           background: file ? "linear-gradient(135deg, #00C896, #00A878)" : "#1a1a1a",
//           border: "none", color: file ? "#0a0a0a" : "#444",
//           fontSize: 16, fontWeight: 700, cursor: file ? "pointer" : "not-allowed",
//           fontFamily: "'DM Mono', monospace", letterSpacing: 1,
//           transition: "all 0.2s ease",
//         }}
//       >
//         {file ? "PROCESS TRANSCRIPT →" : "SELECT A FILE TO CONTINUE"}
//       </button>
//     </div>
//   );
// }

// function ProcessingView({ onDone }) {
//   const [progress, setProgress] = useState(0);
//   const [phase, setPhase] = useState(0);

//   const phases = [
//     "Extracting text with OCR...",
//     "Identifying university format...",
//     "Mapping course titles...",
//     "Converting grading scale...",
//     "Normalizing credit hours...",
//     "Generating WES report...",
//   ];

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setProgress(p => {
//         const next = p + 1.8;
//         if (next >= 100) {
//           clearInterval(interval);
//           setTimeout(onDone, 600);
//           return 100;
//         }
//         setPhase(Math.floor((next / 100) * phases.length));
//         return next;
//       });
//     }, 60);
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div style={{ textAlign: "center", padding: "20px 0" }}>
//       <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 32px" }}>
//         <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
//           <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1a1a" strokeWidth="6" />
//           <circle cx="60" cy="60" r="50" fill="none" stroke="#00C896" strokeWidth="6"
//             strokeDasharray={`${2 * Math.PI * 50}`}
//             strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
//             strokeLinecap="round"
//             style={{ transition: "stroke-dashoffset 0.1s linear" }}
//           />
//         </svg>
//         <div style={{
//           position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
//           color: "#00C896", fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace"
//         }}>{Math.floor(progress)}%</div>
//       </div>

//       <div style={{ color: "#fff", fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Analyzing Transcript</div>
//       <div style={{
//         color: "#00C896", fontSize: 13, fontFamily: "'DM Mono', monospace",
//         letterSpacing: 1, marginBottom: 32, minHeight: 20
//       }}>
//         {phases[Math.min(phase, phases.length - 1)]}
//       </div>

//       <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 20, textAlign: "left" }}>
//         {phases.slice(0, Math.min(phase + 1, phases.length)).map((p, i) => (
//           <div key={i} style={{
//             display: "flex", alignItems: "center", gap: 10,
//             color: i < phase ? "#555" : "#00C896",
//             fontSize: 13, fontFamily: "'DM Mono', monospace",
//             padding: "6px 0", borderBottom: i < phases.length - 1 ? "1px solid #1a1a1a" : "none"
//           }}>
//             <span>{i < phase ? "✓" : "▶"}</span>
//             <span>{p}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function ReviewView({ onDownload, generatePDF, courses, university }) {
//   const totalUSCredits = courses.reduce((s, c) => s + (c.usCredits || c.credits || 3), 0);
//   const weightedGPA = courses.reduce((s, c) => s + ((c.convertedGPA || c.gpa || 3.0) * (c.usCredits || c.credits || 3)), 0) / totalUSCredits;

//   return (
//     <div>
//       <div style={{
//         display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28
//       }}>
//         {[
//           { label: "Cumulative GPA", value: weightedGPA.toFixed(2), sub: "on 4.0 scale" },
//           { label: "US Credit Hours", value: totalUSCredits, sub: "semester hours" },
//           { label: "Courses Mapped", value: courses.length, sub: "successfully" },
//         ].map(s => (
//           <div key={s.label} style={{
//             background: "#0f0f0f", borderRadius: 12, padding: 16, textAlign: "center",
//             border: "1px solid #1a1a1a"
//           }}>
//             <div style={{ color: "#00C896", fontSize: 26, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
//             <div style={{ color: "#fff", fontSize: 11, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
//             <div style={{ color: "#444", fontSize: 10, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{s.sub}</div>
//           </div>
//         ))}
//       </div>

//       <div style={{
//         background: "#0f0f0f", borderRadius: 12, overflow: "hidden",
//         border: "1px solid #1a1a1a", marginBottom: 24
//       }}>
//         <div style={{
//           display: "grid", gridTemplateColumns: "1fr 80px 60px 80px 80px",
//           padding: "10px 16px", background: "#141414",
//           color: "#444", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1,
//           borderBottom: "1px solid #1a1a1a"
//         }}>
//           <span>COURSE</span><span style={{ textAlign: "center" }}>GRADE</span>
//           <span style={{ textAlign: "center" }}>US CR</span>
//           <span style={{ textAlign: "center" }}>US GRADE</span>
//           <span style={{ textAlign: "center" }}>GPA PTS</span>
//         </div>
//         {courses.map((c, i) => (
//           <div key={c.code || i} style={{
//             display: "grid", gridTemplateColumns: "1fr 80px 60px 80px 80px",
//             padding: "12px 16px",
//             borderBottom: i < courses.length - 1 ? "1px solid #141414" : "none",
//           }}>
//             <div>
//               <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{c.title || "N/A"}</div>
//               <div style={{ color: "#444", fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{c.code || "N/A"}</div>
//             </div>
//             <div style={{ textAlign: "center", color: "#666", fontSize: 13, fontFamily: "'DM Mono', monospace", paddingTop: 4 }}>{c.grade || "N/A"}</div>
//             <div style={{ textAlign: "center", color: "#fff", fontSize: 13, fontFamily: "'DM Mono', monospace", paddingTop: 4 }}>{c.usCredits || c.credits || "3"}</div>
//             <div style={{ textAlign: "center", paddingTop: 4 }}>
//               <span style={{
//                 padding: "2px 8px", borderRadius: 4,
//                 background: (c.convertedGPA || c.gpa || 3.0) >= 3.7 ? "rgba(0,200,150,0.15)" : (c.convertedGPA || c.gpa || 3.0) >= 3.0 ? "rgba(255,200,0,0.15)" : "rgba(255,100,100,0.1)",
//                 color: (c.convertedGPA || c.gpa || 3.0) >= 3.7 ? "#00C896" : (c.convertedGPA || c.gpa || 3.0) >= 3.0 ? "#FFC800" : "#FF6464",
//                 fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700
//               }}>{c.usGrade || "N/A"}</span>
//             </div>
//             <div style={{ textAlign: "center", color: "#fff", fontSize: 13, fontFamily: "'DM Mono', monospace", paddingTop: 4 }}>{(c.convertedGPA || c.gpa || 0).toFixed(1)}</div>
//           </div>
//         ))}
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//         <button onClick={() => { generatePDF(courses); onDownload(); }} style={{
//           padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #00C896, #00A878)",
//           border: "none", color: "#0a0a0a", fontSize: 14, fontWeight: 700,
//           cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: 1
//         }}>⬇ DOWNLOAD PDF</button>
//         <button style={{
//           padding: "14px", borderRadius: 10, background: "transparent",
//           border: "1px solid #333", color: "#fff", fontSize: 14, fontWeight: 600,
//           cursor: "pointer", fontFamily: "'DM Mono', monospace"
//         }}>✎ EDIT MANUALLY</button>
//       </div>
//     </div>
//   );
// }

// function DownloadView({ onReset }) {
//   return (
//     <div style={{ textAlign: "center", padding: "20px 0" }}>
//       <div style={{
//         width: 80, height: 80, borderRadius: "50%",
//         background: "rgba(0,200,150,0.1)", border: "2px solid #00C896",
//         display: "flex", alignItems: "center", justifyContent: "center",
//         fontSize: 36, margin: "0 auto 24px"
//       }}>✓</div>
//       <h3 style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Transcript Ready!</h3>
//       <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Your WES-format transcript has been generated and downloaded.</p>

//       <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 20, marginBottom: 24, textAlign: "left" }}>
//         <div style={{ color: "#444", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 12 }}>WHAT'S INCLUDED</div>
//         {[
//           "✓  WES-format PDF transcript",
//           "✓  GPA conversion report",
//           "✓  Credit hour mapping table",
//           "✓  Course title translations",
//           "✓  Grading scale reference",
//         ].map(item => (
//           <div key={item} style={{ color: "#ccc", fontSize: 13, padding: "6px 0", fontFamily: "'DM Mono', monospace" }}>{item}</div>
//         ))}
//       </div>

//       <button onClick={onReset} style={{
//         width: "100%", padding: "14px", borderRadius: 10, background: "transparent",
//         border: "1px solid #333", color: "#fff", fontSize: 14, fontWeight: 600,
//         cursor: "pointer", fontFamily: "'DM Mono', monospace"
//       }}>PROCESS ANOTHER TRANSCRIPT</button>
//     </div>
//   );
// }

// export default function App() {
//   const [step, setStep] = useState(0);
//   const [activeTab, setActiveTab] = useState("tool");
//   const [courses, setCourses] = useState(SAMPLE_COURSES);
//   const [university, setUniversity] = useState("Unknown");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const toolRef = useRef(null);

//   const scrollToTool = () => {
//     toolRef.current?.scrollIntoView({ behavior: "smooth" });
//     setActiveTab("tool");
//   };

//   const reset = () => {
//     setStep(0);
//     setCourses(SAMPLE_COURSES);
//     setUniversity("Unknown");
//   };

//   const uploadFile = async (file) => {
//     try {
//       setIsProcessing(true);
//       console.log("Starting upload for file:", file.name, "size:", file.size);

//       const formData = new FormData();
//       formData.append("file", file);

//       console.log("Making fetch request to backend...");
//       const response = await fetch("http://localhost:5001/api/upload", {
//         method: "POST",
//         body: formData,
//       });

//       console.log("Response status:", response.status, response.statusText);
//       console.log("Response headers:", Object.fromEntries(response.headers.entries()));

//       if (!response.ok) {
//         let errMsg = `${response.status} ${response.statusText}`;
//         try {
//           const errData = await response.json();
//           errMsg = errData.message || errData.error || errMsg;
//           if (errData.hint) errMsg += `\n\nHint: ${errData.hint}`;
//         } catch (_) {}
//         throw new Error(errMsg);
//       }

//       const data = await response.json();
//       console.log("Response data:", data);
      
//       if (data.success && data.data.courses.length > 0) {
//         setCourses(data.data.courses);
//         setUniversity(data.data.university);
//         console.log("Extracted courses:", data.data.courses);
//         setStep(1);
//       } else {
//         // Extraction failed — show error, stay on upload step
//         alert(
//           "Could not extract courses from this file.\n\n" +
//           "Tips:\n• Make sure the PDF is text-based (not a scanned image)\n" +
//           "• For scanned transcripts, try uploading as JPG/PNG\n" +
//           "• Or use a CSV/Excel file with columns: Code, Title, Grade, Credits"
//         );
//         setIsProcessing(false);
//         return;
//       }
//       setIsProcessing(false);
//     } catch (error) {
//       console.error("Upload error:", error);
//       alert("Error processing file: " + error.message);
//       setIsProcessing(false);
//     }
//   };

//   const generatePDF = (coursesToExport = courses) => {
//     const doc = new jsPDF();
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const pageHeight = doc.internal.pageSize.getHeight();
//     const margin = 15;
//     let yPosition = margin;

//     // Set font for title
//     doc.setFontSize(20);
//     doc.setFont(undefined, "bold");
//     doc.text("WES International Credential Evaluation", margin, yPosition);

//     // Add header info
//     yPosition += 12;
//     doc.setFontSize(10);
//     doc.setFont(undefined, "normal");
//     doc.text("Date Generated: " + new Date().toLocaleDateString(), margin, yPosition);
//     yPosition += 8;
//     doc.text("Format: WES Standard Transcript Report", margin, yPosition);
    yPosition += 6;
//     const scaleUsed = coursesToExport[0]?.gradeScaleType || "unknown";
//     doc.text("Grade Scale: " + scaleUsed, margin, yPosition);

//     // Add GPA section
//     yPosition += 12;
//     doc.setFontSize(12);
//     doc.setFont(undefined, "bold");
//     doc.text("Summary", margin, yPosition);
//     yPosition += 8;
    
//     doc.setFontSize(10);
//     doc.setFont(undefined, "normal");
//     const totalUSCredits = coursesToExport.reduce((s, c) => s + (c.usCredits || c.credits || 3), 0);
//     const weightedGPA = coursesToExport.reduce((s, c) => s + (c.convertedGPA || c.gpa || 0) * (c.usCredits || c.credits || 3), 0) / totalUSCredits;
    
//     doc.text("Cumulative GPA (4.0 scale): " + weightedGPA.toFixed(2), margin + 5, yPosition);
//     yPosition += 6;
//     doc.text("Total US Credit Hours: " + totalUSCredits, margin + 5, yPosition);
//     yPosition += 6;
//     doc.text("Total Courses: " + coursesToExport.length, margin + 5, yPosition);

//     // Add courses table
//     yPosition += 10;
//     doc.setFontSize(12);
//     doc.setFont(undefined, "bold");
//     doc.text("Course Details", margin, yPosition);
//     yPosition += 8;

//     doc.setFontSize(9);
//     doc.setFont(undefined, "bold");
//     doc.text("Code", margin, yPosition);
//     doc.text("Title", margin + 20, yPosition);
//     doc.text("Grade", margin + 100, yPosition);
//     doc.text("US Grade", margin + 120, yPosition);
//     doc.text("US Cr", margin + 150, yPosition);
//     doc.text("GPA", margin + 170, yPosition);

//     yPosition += 7;
//     doc.setFont(undefined, "normal");
//     doc.setFontSize(8);

//     coursesToExport.forEach((course, index) => {
//       if (yPosition > pageHeight - 20) {
//         doc.addPage();
//         yPosition = margin;
//       }
//       doc.text(course.code, margin, yPosition);
//       doc.text((course.title || "").substring(0, 45), margin + 20, yPosition);
//       doc.text(course.grade, margin + 100, yPosition);
//       doc.text(course.usGrade || "N/A", margin + 120, yPosition);
//       doc.text(course.usCredits.toString(), margin + 150, yPosition);
//       doc.text((course.convertedGPA || course.gpa || 0).toFixed(1), margin + 170, yPosition);
//       yPosition += 6;
//     });

//     // Save the PDF
//     doc.save("TranscriptIQ_WES_Report.pdf");
//   };

//   return (
//     <div style={{
//       minHeight: "100vh",
//       background: "#0a0a0a",
//       color: "#fff",
//       fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
//     }}>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');

//         * { box-sizing: border-box; margin: 0; padding: 0; }
        
//         ::-webkit-scrollbar { width: 6px; }
//         ::-webkit-scrollbar-track { background: #0a0a0a; }
//         ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }

//         .nav-link { 
//           color: #555; text-decoration: none; font-size: 14px; 
//           transition: color 0.2s; cursor: pointer;
//         }
//         .nav-link:hover { color: #fff; }
        
//         .feature-card {
//           background: #0f0f0f;
//           border: 1px solid #1a1a1a;
//           border-radius: 16px;
//           padding: 28px;
//           transition: all 0.2s ease;
//         }
//         .feature-card:hover {
//           border-color: #2a2a2a;
//           background: #111;
//           transform: translateY(-2px);
//         }

//         .stat-card {
//           text-align: center;
//           padding: 20px;
//         }

//         @keyframes float {
//           0%, 100% { transform: translateY(0px); }
//           50% { transform: translateY(-10px); }
//         }
//         @keyframes pulse-ring {
//           0% { transform: scale(0.95); opacity: 1; }
//           100% { transform: scale(1.15); opacity: 0; }
//         }
//         @keyframes fade-up {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .fade-up { animation: fade-up 0.6s ease forwards; }
//         .fade-up-delay-1 { animation: fade-up 0.6s ease 0.1s forwards; opacity: 0; }
//         .fade-up-delay-2 { animation: fade-up 0.6s ease 0.2s forwards; opacity: 0; }
//         .fade-up-delay-3 { animation: fade-up 0.6s ease 0.3s forwards; opacity: 0; }
//       `}</style>

//       {/* NAV */}
//       <nav style={{
//         position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
//         padding: "16px 40px",
//         background: "rgba(10,10,10,0.85)", backdropFilter: "blur(20px)",
//         borderBottom: "1px solid #111",
//         display: "flex", alignItems: "center", justifyContent: "space-between"
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <div style={{
//             width: 32, height: 32, borderRadius: 8,
//             background: "linear-gradient(135deg, #00C896, #00856A)",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             fontSize: 16
//           }}>📑</div>
//           <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>
//             TranscriptIQ
//           </span>
//         </div>

//         <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
//           {["Features", "How It Works", "Pricing"].map(l => (
//             <span key={l} className="nav-link">{l}</span>
//           ))}
//           <button onClick={scrollToTool} style={{
//             padding: "9px 20px", borderRadius: 8,
//             background: "linear-gradient(135deg, #00C896, #00A878)",
//             border: "none", color: "#0a0a0a",
//             fontSize: 13, fontWeight: 700, cursor: "pointer",
//             fontFamily: "'DM Mono', monospace", letterSpacing: 0.5
//           }}>TRY FREE →</button>
//         </div>
//       </nav>

//       {/* HERO */}
//       <section style={{
//         paddingTop: 140, paddingBottom: 100,
//         textAlign: "center",
//         maxWidth: 900, margin: "0 auto",
//         padding: "140px 24px 100px",
//         position: "relative",
//       }}>
//         {/* Background glow */}
//         <div style={{
//           position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)",
//           width: 600, height: 400,
//           background: "radial-gradient(ellipse, rgba(0,200,150,0.06) 0%, transparent 70%)",
//           pointerEvents: "none"
//         }} />

//         <div className="fade-up" style={{
//           display: "inline-flex", alignItems: "center", gap: 8,
//           background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)",
//           borderRadius: 20, padding: "6px 16px", marginBottom: 28,
//           color: "#00C896", fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1
//         }}>
//           <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C896", display: "inline-block" }} />
//           WES-COMPATIBLE · INSTANT CONVERSION · FREE TO TRY
//         </div>

//         <h1 className="fade-up-delay-1" style={{
//           fontSize: "clamp(42px, 7vw, 72px)",
//           fontFamily: "'Syne', sans-serif",
//           fontWeight: 800, lineHeight: 1.05,
//           letterSpacing: -2, marginBottom: 24,
//         }}>
//           Stop converting<br />
//           <span style={{ color: "#00C896" }}>transcripts manually.</span>
//         </h1>

//         <p className="fade-up-delay-2" style={{
//           fontSize: 18, color: "#555", lineHeight: 1.7,
//           maxWidth: 560, margin: "0 auto 40px",
//         }}>
//           Upload your Indian university transcript. Get a WES-standard normalized report with GPA conversion, credit mapping, and course translations — in under 60 seconds.
//         </p>

//         <div className="fade-up-delay-3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
//           <button onClick={scrollToTool} style={{
//             padding: "15px 32px", borderRadius: 12,
//             background: "linear-gradient(135deg, #00C896, #00A878)",
//             border: "none", color: "#0a0a0a",
//             fontSize: 15, fontWeight: 700, cursor: "pointer",
//             fontFamily: "'Syne', sans-serif",
//           }}>
//             Convert My Transcript →
//           </button>
//           <button style={{
//             padding: "15px 32px", borderRadius: 12,
//             background: "transparent", border: "1px solid #222",
//             color: "#fff", fontSize: 15, cursor: "pointer",
//             fontFamily: "'Syne', sans-serif",
//           }}>
//             See Sample Output
//           </button>
//         </div>
//       </section>

//       {/* STATS */}
//       <section style={{
//         borderTop: "1px solid #111", borderBottom: "1px solid #111",
//         padding: "48px 24px",
//       }}>
//         <div style={{
//           maxWidth: 900, margin: "0 auto",
//           display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0
//         }}>
//           {[
//             { n: 15000, s: "+", label: "Transcripts Processed" },
//             { n: 500, s: "+", label: "University Formats" },
//             { n: 99, s: "%", label: "Accuracy Rate" },
//             { n: 45, s: "sec", label: "Avg. Processing Time" },
//           ].map((s, i) => (
//             <div key={s.label} className="stat-card" style={{
//               borderRight: i < 3 ? "1px solid #111" : "none"
//             }}>
//               <div style={{
//                 fontSize: 36, fontWeight: 800, fontFamily: "'Syne', sans-serif",
//                 color: "#fff", marginBottom: 6
//               }}>
//                 <AnimatedCounter target={s.n} suffix={s.s} />
//               </div>
//               <div style={{ color: "#444", fontSize: 13 }}>{s.label}</div>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* TOOL SECTION */}
//       <section ref={toolRef} style={{ padding: "100px 24px", maxWidth: 760, margin: "0 auto" }}>
//         <div style={{ textAlign: "center", marginBottom: 56 }}>
//           <h2 style={{
//             fontSize: 38, fontFamily: "'Syne', sans-serif",
//             fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
//           }}>Try it now — free</h2>
//           <p style={{ color: "#555", fontSize: 16 }}>No signup required. Upload, convert, download.</p>
//         </div>

//         <div style={{
//           background: "#0d0d0d",
//           border: "1px solid #1a1a1a",
//           borderRadius: 20,
//           padding: "48px 40px",
//         }}>
//           <StepIndicator current={step} />

//           {step === 0 && <UploadZone uploadFile={uploadFile} />}
//           {step === 1 && <ProcessingView onDone={() => setStep(2)} />}
//           {step === 2 && <ReviewView onDownload={() => setStep(3)} generatePDF={generatePDF} courses={courses} university={university} />}
//           {step === 3 && <DownloadView onReset={reset} />}
//         </div>
//       </section>

//       {/* FEATURES */}
//       <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
//         <div style={{ textAlign: "center", marginBottom: 60 }}>
//           <h2 style={{
//             fontSize: 38, fontFamily: "'Syne', sans-serif",
//             fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
//           }}>Everything you need</h2>
//           <p style={{ color: "#555", fontSize: 16 }}>Built specifically for students applying to US and Canadian universities</p>
//         </div>

//         <div style={{
//           display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20
//         }}>
//           {FEATURES.map(f => (
//             <div key={f.title} className="feature-card">
//               <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
//               <h3 style={{
//                 fontSize: 17, fontWeight: 700, fontFamily: "'Syne', sans-serif",
//                 marginBottom: 10, letterSpacing: -0.3
//               }}>{f.title}</h3>
//               <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* HOW IT WORKS */}
//       <section style={{
//         padding: "80px 24px",
//         borderTop: "1px solid #111",
//         maxWidth: 900, margin: "0 auto"
//       }}>
//         <div style={{ textAlign: "center", marginBottom: 60 }}>
//           <h2 style={{
//             fontSize: 38, fontFamily: "'Syne', sans-serif",
//             fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
//           }}>How it works</h2>
//         </div>

//         <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, position: "relative" }}>
//           {[
//             { n: "01", title: "Upload", desc: "Drop your transcript in any format — PDF, image, CSV" },
//             { n: "02", title: "Extract", desc: "AI reads all courses, grades, and credit hours" },
//             { n: "03", title: "Convert", desc: "We apply WES grading tables and normalize credits" },
//             { n: "04", title: "Download", desc: "Get a polished WES-format PDF, ready to submit" },
//           ].map((s, i) => (
//             <div key={s.n} style={{
//               padding: "0 20px", textAlign: "center",
//               borderRight: i < 3 ? "1px solid #1a1a1a" : "none"
//             }}>
//               <div style={{
//                 width: 48, height: 48, borderRadius: "50%",
//                 background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)",
//                 display: "flex", alignItems: "center", justifyContent: "center",
//                 color: "#00C896", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
//                 margin: "0 auto 20px"
//               }}>{s.n}</div>
//               <h3 style={{
//                 fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif",
//                 marginBottom: 10
//               }}>{s.title}</h3>
//               <p style={{ color: "#444", fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* CTA */}
//       <section style={{
//         padding: "100px 24px", textAlign: "center",
//         borderTop: "1px solid #111",
//       }}>
//         <div style={{
//           maxWidth: 600, margin: "0 auto",
//           background: "linear-gradient(135deg, rgba(0,200,150,0.05), rgba(0,168,120,0.02))",
//           border: "1px solid rgba(0,200,150,0.1)",
//           borderRadius: 24, padding: "60px 48px"
//         }}>
//           <h2 style={{
//             fontSize: 40, fontFamily: "'Syne', sans-serif",
//             fontWeight: 800, letterSpacing: -1.5, marginBottom: 16
//           }}>Ready to get started?</h2>
//           <p style={{ color: "#555", fontSize: 16, marginBottom: 36 }}>
//             Join thousands of students who have simplified their WES application process.
//           </p>
//           <button onClick={scrollToTool} style={{
//             padding: "16px 40px", borderRadius: 12,
//             background: "linear-gradient(135deg, #00C896, #00A878)",
//             border: "none", color: "#0a0a0a",
//             fontSize: 16, fontWeight: 700, cursor: "pointer",
//             fontFamily: "'Syne', sans-serif",
//           }}>
//             Convert Transcript Free →
//           </button>
//         </div>
//       </section>

//       {/* FOOTER */}
//       <footer style={{
//         borderTop: "1px solid #111",
//         padding: "40px 24px",
//         display: "flex", alignItems: "center", justifyContent: "space-between",
//         maxWidth: 1100, margin: "0 auto",
//         flexWrap: "wrap", gap: 16
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//           <div style={{
//             width: 24, height: 24, borderRadius: 6,
//             background: "linear-gradient(135deg, #00C896, #00856A)",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             fontSize: 12
//           }}>📑</div>
//           <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>TranscriptIQ</span>
//         </div>
//         <div style={{ display: "flex", gap: 24 }}>
//           {["Privacy", "Terms", "Contact"].map(l => (
//             <span key={l} className="nav-link" style={{ fontSize: 13 }}>{l}</span>
//           ))}
//         </div>
//         <div style={{ color: "#333", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
//           © 2025 TranscriptIQ
//         </div>
//       </footer>
//     </div>
//   );
// }

// import { useState, useRef, useEffect } from "react";
// import jsPDF from "jspdf";

// const STEPS = ["Upload", "Processing", "Review", "Download"];

// const SAMPLE_COURSES = [
//   { code: "CS301", title: "Data Structures and Algorithms", credits: 4, grade: "87%", usGrade: "B+", usCredits: 3.0, gpa: 3.3 },
//   { code: "MA201", title: "Engineering Mathematics II", credits: 4, grade: "91%", usGrade: "A-", usCredits: 3.0, gpa: 3.7 },
//   { code: "CS302", title: "Operating Systems", credits: 3, grade: "78%", usGrade: "B", usCredits: 3.0, gpa: 3.0 },
//   { code: "EC201", title: "Basic Electronics", credits: 3, grade: "83%", usGrade: "B+", usCredits: 3.0, gpa: 3.3 },
//   { code: "CS303", title: "Database Management Systems", credits: 4, grade: "94%", usGrade: "A", usCredits: 3.0, gpa: 4.0 },
//   { code: "CS304", title: "Computer Networks", credits: 3, grade: "80%", usGrade: "B", usCredits: 3.0, gpa: 3.0 },
// ];

// const FEATURES = [
//   { icon: "⚡", title: "Instant Extraction", desc: "AI-powered OCR reads PDFs, images, and scanned documents in seconds" },
//   { icon: "🎓", title: "500+ University Formats", desc: "Recognizes grading systems from IITs, NITs, VTU, Mumbai, Anna, and more" },
//   { icon: "📊", title: "WES-Standard Output", desc: "Output formatted exactly to World Education Services requirements" },
//   { icon: "🔄", title: "Smart GPA Conversion", desc: "Percentage → GPA mapping using official WES conversion tables" },
//   { icon: "📋", title: "Credit Normalization", desc: "Converts variable credit systems to standard US semester hours" },
//   { icon: "🔒", title: "Bank-grade Security", desc: "Your transcripts are encrypted and never stored after processing" },
// ];

// const UNIVERSITIES = ["IIT Bombay", "Delhi University", "VTU", "Anna University", "Mumbai University", "JNTU", "Pune University", "Osmania University"];

// function AnimatedCounter({ target, suffix = "" }) {
//   const [count, setCount] = useState(0);
//   const ref = useRef(null);
//   const started = useRef(false);

//   useEffect(() => {
//     const observer = new IntersectionObserver(([entry]) => {
//       if (entry.isIntersecting && !started.current) {
//         started.current = true;
//         let start = 0;
//         const step = target / 60;
//         const timer = setInterval(() => {
//           start += step;
//           if (start >= target) { setCount(target); clearInterval(timer); }
//           else setCount(Math.floor(start));
//         }, 16);
//       }
//     });
//     if (ref.current) observer.observe(ref.current);
//     return () => observer.disconnect();
//   }, [target]);

//   return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
// }

// function StepIndicator({ current }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 40 }}>
//       {STEPS.map((step, i) => (
//         <div key={step} style={{ display: "flex", alignItems: "center" }}>
//           <div style={{
//             display: "flex", flexDirection: "column", alignItems: "center", gap: 6
//           }}>
//             <div style={{
//               width: 36, height: 36, borderRadius: "50%",
//               background: i < current ? "#00C896" : i === current ? "#fff" : "transparent",
//               border: `2px solid ${i <= current ? "#00C896" : "#333"}`,
//               display: "flex", alignItems: "center", justifyContent: "center",
//               color: i < current ? "#0a0a0a" : i === current ? "#0a0a0a" : "#555",
//               fontSize: 14, fontWeight: 700,
//               transition: "all 0.3s ease",
//             }}>
//               {i < current ? "✓" : i + 1}
//             </div>
//             <span style={{ fontSize: 11, color: i === current ? "#00C896" : "#555", fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
//               {step.toUpperCase()}
//             </span>
//           </div>
//           {i < STEPS.length - 1 && (
//             <div style={{
//               width: 80, height: 2, marginBottom: 22,
//               background: i < current ? "#00C896" : "#222",
//               transition: "background 0.3s ease"
//             }} />
//           )}
//         </div>
//       ))}
//     </div>
//   );
// }

// function UploadZone({ uploadFile }) {
//   const [dragging, setDragging] = useState(false);
//   const [file, setFile] = useState(null);
//   const inputRef = useRef();

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setDragging(false);
//     const f = e.dataTransfer.files[0];
//     if (f) { setFile(f); }
//   };

//   const handleChange = (e) => {
//     const f = e.target.files[0];
//     if (f) setFile(f);
//   };

//   return (
//     <div style={{ textAlign: "center" }}>
//       <div
//         onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
//         onDragLeave={() => setDragging(false)}
//         onDrop={handleDrop}
//         onClick={() => inputRef.current.click()}
//         style={{
//           border: `2px dashed ${dragging ? "#00C896" : file ? "#00C896" : "#333"}`,
//           borderRadius: 16,
//           padding: "60px 40px",
//           cursor: "pointer",
//           background: dragging ? "rgba(0,200,150,0.05)" : file ? "rgba(0,200,150,0.03)" : "rgba(255,255,255,0.02)",
//           transition: "all 0.2s ease",
//           marginBottom: 24,
//         }}
//       >
//         <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.txt" onChange={handleChange} style={{ display: "none" }} />
//         {file ? (
//           <>
//             <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
//             <div style={{ color: "#00C896", fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{file.name}</div>
//             <div style={{ color: "#555", fontSize: 13, marginTop: 8 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
//           </>
//         ) : (
//           <>
//             <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.6 }}>📄</div>
//             <div style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Drop your transcript here</div>
//             <div style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>or click to browse files</div>
//             <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
//               {["PDF", "JPG/PNG", "CSV/XLSX", "TXT"].map(f => (
//                 <span key={f} style={{
//                   padding: "4px 12px", borderRadius: 20,
//                   border: "1px solid #333", color: "#555",
//                   fontSize: 12, fontFamily: "'DM Mono', monospace"
//                 }}>{f}</span>
//               ))}
//             </div>
//           </>
//         )}
//       </div>

//       <div style={{ marginBottom: 24 }}>
//         <div style={{ color: "#444", fontSize: 12, marginBottom: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>OR SELECT YOUR UNIVERSITY</div>
//         <select style={{
//           background: "#111", border: "1px solid #333", color: "#fff",
//           padding: "12px 16px", borderRadius: 10, fontSize: 14, width: "100%",
//           fontFamily: "'DM Mono', monospace", outline: "none", cursor: "pointer"
//         }}>
//           <option value="">Auto-detect from transcript...</option>
//           {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
//         </select>
//       </div>

//       <button
//         onClick={() => file && uploadFile(file)}
//         style={{
//           width: "100%", padding: "16px", borderRadius: 12,
//           background: file ? "linear-gradient(135deg, #00C896, #00A878)" : "#1a1a1a",
//           border: "none", color: file ? "#0a0a0a" : "#444",
//           fontSize: 16, fontWeight: 700, cursor: file ? "pointer" : "not-allowed",
//           fontFamily: "'DM Mono', monospace", letterSpacing: 1,
//           transition: "all 0.2s ease",
//         }}
//       >
//         {file ? "PROCESS TRANSCRIPT →" : "SELECT A FILE TO CONTINUE"}
//       </button>
//     </div>
//   );
// }

// function ProcessingView({ onDone }) {
//   const [progress, setProgress] = useState(0);
//   const [phase, setPhase] = useState(0);

//   const phases = [
//     "Extracting text with OCR...",
//     "Identifying university format...",
//     "Mapping course titles...",
//     "Converting grading scale...",
//     "Normalizing credit hours...",
//     "Generating WES report...",
//   ];

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setProgress(p => {
//         const next = p + 1.8;
//         if (next >= 100) {
//           clearInterval(interval);
//           setTimeout(onDone, 600);
//           return 100;
//         }
//         setPhase(Math.floor((next / 100) * phases.length));
//         return next;
//       });
//     }, 60);
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div style={{ textAlign: "center", padding: "20px 0" }}>
//       <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 32px" }}>
//         <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
//           <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1a1a" strokeWidth="6" />
//           <circle cx="60" cy="60" r="50" fill="none" stroke="#00C896" strokeWidth="6"
//             strokeDasharray={`${2 * Math.PI * 50}`}
//             strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
//             strokeLinecap="round"
//             style={{ transition: "stroke-dashoffset 0.1s linear" }}
//           />
//         </svg>
//         <div style={{
//           position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
//           color: "#00C896", fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace"
//         }}>{Math.floor(progress)}%</div>
//       </div>

//       <div style={{ color: "#fff", fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Analyzing Transcript</div>
//       <div style={{
//         color: "#00C896", fontSize: 13, fontFamily: "'DM Mono', monospace",
//         letterSpacing: 1, marginBottom: 32, minHeight: 20
//       }}>
//         {phases[Math.min(phase, phases.length - 1)]}
//       </div>

//       <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 20, textAlign: "left" }}>
//         {phases.slice(0, Math.min(phase + 1, phases.length)).map((p, i) => (
//           <div key={i} style={{
//             display: "flex", alignItems: "center", gap: 10,
//             color: i < phase ? "#555" : "#00C896",
//             fontSize: 13, fontFamily: "'DM Mono', monospace",
//             padding: "6px 0", borderBottom: i < phases.length - 1 ? "1px solid #1a1a1a" : "none"
//           }}>
//             <span>{i < phase ? "✓" : "▶"}</span>
//             <span>{p}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function ReviewView({ onDownload, generatePDF, courses, university }) {
//   const totalUSCredits = courses.reduce((s, c) => s + (c.usCredits || c.credits || 3), 0);
//   const weightedGPA = courses.reduce((s, c) => s + ((c.convertedGPA || c.gpa || 3.0) * (c.usCredits || c.credits || 3)), 0) / totalUSCredits;

//   return (
//     <div>
//       <div style={{
//         display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28
//       }}>
//         {[
//           { label: "Cumulative GPA", value: weightedGPA.toFixed(2), sub: "on 4.0 scale" },
//           { label: "US Credit Hours", value: totalUSCredits, sub: "semester hours" },
//           { label: "Courses Mapped", value: courses.length, sub: "successfully" },
//         ].map(s => (
//           <div key={s.label} style={{
//             background: "#0f0f0f", borderRadius: 12, padding: 16, textAlign: "center",
//             border: "1px solid #1a1a1a"
//           }}>
//             <div style={{ color: "#00C896", fontSize: 26, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
//             <div style={{ color: "#fff", fontSize: 11, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
//             <div style={{ color: "#444", fontSize: 10, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{s.sub}</div>
//           </div>
//         ))}
//       </div>

//       <div style={{
//         background: "#0f0f0f", borderRadius: 12, overflow: "hidden",
//         border: "1px solid #1a1a1a", marginBottom: 24
//       }}>
//         <div style={{
//           display: "grid", gridTemplateColumns: "1fr 80px 60px 80px 80px",
//           padding: "10px 16px", background: "#141414",
//           color: "#444", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1,
//           borderBottom: "1px solid #1a1a1a"
//         }}>
//           <span>COURSE</span><span style={{ textAlign: "center" }}>GRADE</span>
//           <span style={{ textAlign: "center" }}>US CR</span>
//           <span style={{ textAlign: "center" }}>US GRADE</span>
//           <span style={{ textAlign: "center" }}>GPA PTS</span>
//         </div>
//         {courses.map((c, i) => (
//           <div key={c.code || i} style={{
//             display: "grid", gridTemplateColumns: "1fr 80px 60px 80px 80px",
//             padding: "12px 16px",
//             borderBottom: i < courses.length - 1 ? "1px solid #141414" : "none",
//           }}>
//             <div>
//               <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{c.title || "N/A"}</div>
//               <div style={{ color: "#444", fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{c.code || "N/A"}</div>
//             </div>
//             <div style={{ textAlign: "center", color: "#666", fontSize: 13, fontFamily: "'DM Mono', monospace", paddingTop: 4 }}>{c.grade || "N/A"}</div>
//             <div style={{ textAlign: "center", color: "#fff", fontSize: 13, fontFamily: "'DM Mono', monospace", paddingTop: 4 }}>{c.usCredits || c.credits || "3"}</div>
//             <div style={{ textAlign: "center", paddingTop: 4 }}>
//               <span style={{
//                 padding: "2px 8px", borderRadius: 4,
//                 background: (c.convertedGPA || c.gpa || 3.0) >= 3.7 ? "rgba(0,200,150,0.15)" : (c.convertedGPA || c.gpa || 3.0) >= 3.0 ? "rgba(255,200,0,0.15)" : "rgba(255,100,100,0.1)",
//                 color: (c.convertedGPA || c.gpa || 3.0) >= 3.7 ? "#00C896" : (c.convertedGPA || c.gpa || 3.0) >= 3.0 ? "#FFC800" : "#FF6464",
//                 fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700
//               }}>{c.usGrade || "N/A"}</span>
//             </div>
//             <div style={{ textAlign: "center", color: "#fff", fontSize: 13, fontFamily: "'DM Mono', monospace", paddingTop: 4 }}>{(c.convertedGPA || c.gpa || 0).toFixed(1)}</div>
//           </div>
//         ))}
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//         <button onClick={() => { generatePDF(courses); onDownload(); }} style={{
//           padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #00C896, #00A878)",
//           border: "none", color: "#0a0a0a", fontSize: 14, fontWeight: 700,
//           cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: 1
//         }}>⬇ DOWNLOAD PDF</button>
//         <button style={{
//           padding: "14px", borderRadius: 10, background: "transparent",
//           border: "1px solid #333", color: "#fff", fontSize: 14, fontWeight: 600,
//           cursor: "pointer", fontFamily: "'DM Mono', monospace"
//         }}>✎ EDIT MANUALLY</button>
//       </div>
//     </div>
//   );
// }

// function DownloadView({ onReset }) {
//   return (
//     <div style={{ textAlign: "center", padding: "20px 0" }}>
//       <div style={{
//         width: 80, height: 80, borderRadius: "50%",
//         background: "rgba(0,200,150,0.1)", border: "2px solid #00C896",
//         display: "flex", alignItems: "center", justifyContent: "center",
//         fontSize: 36, margin: "0 auto 24px"
//       }}>✓</div>
//       <h3 style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Transcript Ready!</h3>
//       <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Your WES-format transcript has been generated and downloaded.</p>

//       <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 20, marginBottom: 24, textAlign: "left" }}>
//         <div style={{ color: "#444", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 12 }}>WHAT'S INCLUDED</div>
//         {[
//           "✓  WES-format PDF transcript",
//           "✓  GPA conversion report",
//           "✓  Credit hour mapping table",
//           "✓  Course title translations",
//           "✓  Grading scale reference",
//         ].map(item => (
//           <div key={item} style={{ color: "#ccc", fontSize: 13, padding: "6px 0", fontFamily: "'DM Mono', monospace" }}>{item}</div>
//         ))}
//       </div>

//       <button onClick={onReset} style={{
//         width: "100%", padding: "14px", borderRadius: 10, background: "transparent",
//         border: "1px solid #333", color: "#fff", fontSize: 14, fontWeight: 600,
//         cursor: "pointer", fontFamily: "'DM Mono', monospace"
//       }}>PROCESS ANOTHER TRANSCRIPT</button>
//     </div>
//   );
// }

// export default function App() {
//   const [step, setStep] = useState(0);
//   const [activeTab, setActiveTab] = useState("tool");
//   const [courses, setCourses] = useState(SAMPLE_COURSES);
//   const [university, setUniversity] = useState("Unknown");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const toolRef = useRef(null);

//   const scrollToTool = () => {
//     toolRef.current?.scrollIntoView({ behavior: "smooth" });
//     setActiveTab("tool");
//   };

//   const reset = () => {
//     setStep(0);
//     setCourses(SAMPLE_COURSES);
//     setUniversity("Unknown");
//   };

//   const uploadFile = async (file) => {
//     try {
//       setIsProcessing(true);
//       console.log("Starting upload for file:", file.name, "size:", file.size);

//       const formData = new FormData();
//       formData.append("file", file);

//       console.log("Making fetch request to backend...");
//       const response = await fetch("http://localhost:5001/api/upload", {
//         method: "POST",
//         body: formData,
//       });

//       console.log("Response status:", response.status, response.statusText);
//       console.log("Response headers:", Object.fromEntries(response.headers.entries()));

//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error("Response not ok, body:", errorText);
//         throw new Error(`File upload failed: ${response.status} ${response.statusText}`);
//       }

//       const data = await response.json();
//       console.log("Response data:", data);
      
//       if (data.success && data.data.courses.length > 0) {
//         // Use extracted data
//         setCourses(data.data.courses);
//         setUniversity(data.data.university);
//         console.log("Extracted courses:", data.data.courses);
//       } else {
//         // Fallback to sample data if extraction failed
//         console.log("No courses extracted, using sample data");
//         setCourses(SAMPLE_COURSES);
//         setUniversity("Sample University");
//       }

//       setStep(1); // Move to processing step
//       setIsProcessing(false);
//     } catch (error) {
//       console.error("Upload error:", error);
//       alert("Error processing file: " + error.message);
//       setIsProcessing(false);
//     }
//   };

//   const generatePDF = (coursesToExport = courses) => {
//     const doc = new jsPDF();
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const pageHeight = doc.internal.pageSize.getHeight();
//     const margin = 15;
//     let yPosition = margin;

//     // Set font for title
//     doc.setFontSize(20);
//     doc.setFont(undefined, "bold");
//     doc.text("WES International Credential Evaluation", margin, yPosition);

//     // Add header info
//     yPosition += 12;
//     doc.setFontSize(10);
//     doc.setFont(undefined, "normal");
//     doc.text("Date Generated: " + new Date().toLocaleDateString(), margin, yPosition);
//     yPosition += 8;
//     doc.text("Format: WES Standard Transcript Report", margin, yPosition);
    yPosition += 6;
//     const scaleUsed = coursesToExport[0]?.gradeScaleType || "unknown";
//     doc.text("Grade Scale: " + scaleUsed, margin, yPosition);

//     // Add GPA section
//     yPosition += 12;
//     doc.setFontSize(12);
//     doc.setFont(undefined, "bold");
//     doc.text("Summary", margin, yPosition);
//     yPosition += 8;
    
//     doc.setFontSize(10);
//     doc.setFont(undefined, "normal");
//     const totalUSCredits = coursesToExport.reduce((s, c) => s + (c.usCredits || c.credits || 3), 0);
//     const weightedGPA = coursesToExport.reduce((s, c) => s + (c.convertedGPA || c.gpa || 0) * (c.usCredits || c.credits || 3), 0) / totalUSCredits;
    
//     doc.text("Cumulative GPA (4.0 scale): " + weightedGPA.toFixed(2), margin + 5, yPosition);
//     yPosition += 6;
//     doc.text("Total US Credit Hours: " + totalUSCredits, margin + 5, yPosition);
//     yPosition += 6;
//     doc.text("Total Courses: " + coursesToExport.length, margin + 5, yPosition);

//     // Add courses table
//     yPosition += 10;
//     doc.setFontSize(12);
//     doc.setFont(undefined, "bold");
//     doc.text("Course Details", margin, yPosition);
//     yPosition += 8;

//     doc.setFontSize(9);
//     doc.setFont(undefined, "bold");
//     doc.text("Code", margin, yPosition);
//     doc.text("Title", margin + 20, yPosition);
//     doc.text("Grade", margin + 100, yPosition);
//     doc.text("US Grade", margin + 120, yPosition);
//     doc.text("US Cr", margin + 150, yPosition);
//     doc.text("GPA", margin + 170, yPosition);

//     yPosition += 7;
//     doc.setFont(undefined, "normal");
//     doc.setFontSize(8);

//     coursesToExport.forEach((course, index) => {
//       if (yPosition > pageHeight - 20) {
//         doc.addPage();
//         yPosition = margin;
//       }
//       doc.text(course.code, margin, yPosition);
//       doc.text((course.title || "").substring(0, 45), margin + 20, yPosition);
//       doc.text(course.grade, margin + 100, yPosition);
//       doc.text(course.usGrade || "N/A", margin + 120, yPosition);
//       doc.text(course.usCredits.toString(), margin + 150, yPosition);
//       doc.text((course.convertedGPA || course.gpa || 0).toFixed(1), margin + 170, yPosition);
//       yPosition += 6;
//     });

//     // Save the PDF
//     doc.save("TranscriptIQ_WES_Report.pdf");
//   };

//   return (
//     <div style={{
//       minHeight: "100vh",
//       background: "#0a0a0a",
//       color: "#fff",
//       fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
//     }}>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');

//         * { box-sizing: border-box; margin: 0; padding: 0; }
        
//         ::-webkit-scrollbar { width: 6px; }
//         ::-webkit-scrollbar-track { background: #0a0a0a; }
//         ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }

//         .nav-link { 
//           color: #555; text-decoration: none; font-size: 14px; 
//           transition: color 0.2s; cursor: pointer;
//         }
//         .nav-link:hover { color: #fff; }
        
//         .feature-card {
//           background: #0f0f0f;
//           border: 1px solid #1a1a1a;
//           border-radius: 16px;
//           padding: 28px;
//           transition: all 0.2s ease;
//         }
//         .feature-card:hover {
//           border-color: #2a2a2a;
//           background: #111;
//           transform: translateY(-2px);
//         }

//         .stat-card {
//           text-align: center;
//           padding: 20px;
//         }

//         @keyframes float {
//           0%, 100% { transform: translateY(0px); }
//           50% { transform: translateY(-10px); }
//         }
//         @keyframes pulse-ring {
//           0% { transform: scale(0.95); opacity: 1; }
//           100% { transform: scale(1.15); opacity: 0; }
//         }
//         @keyframes fade-up {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .fade-up { animation: fade-up 0.6s ease forwards; }
//         .fade-up-delay-1 { animation: fade-up 0.6s ease 0.1s forwards; opacity: 0; }
//         .fade-up-delay-2 { animation: fade-up 0.6s ease 0.2s forwards; opacity: 0; }
//         .fade-up-delay-3 { animation: fade-up 0.6s ease 0.3s forwards; opacity: 0; }
//       `}</style>

//       {/* NAV */}
//       <nav style={{
//         position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
//         padding: "16px 40px",
//         background: "rgba(10,10,10,0.85)", backdropFilter: "blur(20px)",
//         borderBottom: "1px solid #111",
//         display: "flex", alignItems: "center", justifyContent: "space-between"
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <div style={{
//             width: 32, height: 32, borderRadius: 8,
//             background: "linear-gradient(135deg, #00C896, #00856A)",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             fontSize: 16
//           }}>📑</div>
//           <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>
//             TranscriptIQ
//           </span>
//         </div>

//         <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
//           {["Features", "How It Works", "Pricing"].map(l => (
//             <span key={l} className="nav-link">{l}</span>
//           ))}
//           <button onClick={scrollToTool} style={{
//             padding: "9px 20px", borderRadius: 8,
//             background: "linear-gradient(135deg, #00C896, #00A878)",
//             border: "none", color: "#0a0a0a",
//             fontSize: 13, fontWeight: 700, cursor: "pointer",
//             fontFamily: "'DM Mono', monospace", letterSpacing: 0.5
//           }}>TRY FREE →</button>
//         </div>
//       </nav>

//       {/* HERO */}
//       <section style={{
//         paddingTop: 140, paddingBottom: 100,
//         textAlign: "center",
//         maxWidth: 900, margin: "0 auto",
//         padding: "140px 24px 100px",
//         position: "relative",
//       }}>
//         {/* Background glow */}
//         <div style={{
//           position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)",
//           width: 600, height: 400,
//           background: "radial-gradient(ellipse, rgba(0,200,150,0.06) 0%, transparent 70%)",
//           pointerEvents: "none"
//         }} />

//         <div className="fade-up" style={{
//           display: "inline-flex", alignItems: "center", gap: 8,
//           background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)",
//           borderRadius: 20, padding: "6px 16px", marginBottom: 28,
//           color: "#00C896", fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1
//         }}>
//           <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C896", display: "inline-block" }} />
//           WES-COMPATIBLE · INSTANT CONVERSION · FREE TO TRY
//         </div>

//         <h1 className="fade-up-delay-1" style={{
//           fontSize: "clamp(42px, 7vw, 72px)",
//           fontFamily: "'Syne', sans-serif",
//           fontWeight: 800, lineHeight: 1.05,
//           letterSpacing: -2, marginBottom: 24,
//         }}>
//           Stop converting<br />
//           <span style={{ color: "#00C896" }}>transcripts manually.</span>
//         </h1>

//         <p className="fade-up-delay-2" style={{
//           fontSize: 18, color: "#555", lineHeight: 1.7,
//           maxWidth: 560, margin: "0 auto 40px",
//         }}>
//           Upload your Indian university transcript. Get a WES-standard normalized report with GPA conversion, credit mapping, and course translations — in under 60 seconds.
//         </p>

//         <div className="fade-up-delay-3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
//           <button onClick={scrollToTool} style={{
//             padding: "15px 32px", borderRadius: 12,
//             background: "linear-gradient(135deg, #00C896, #00A878)",
//             border: "none", color: "#0a0a0a",
//             fontSize: 15, fontWeight: 700, cursor: "pointer",
//             fontFamily: "'Syne', sans-serif",
//           }}>
//             Convert My Transcript →
//           </button>
//           <button style={{
//             padding: "15px 32px", borderRadius: 12,
//             background: "transparent", border: "1px solid #222",
//             color: "#fff", fontSize: 15, cursor: "pointer",
//             fontFamily: "'Syne', sans-serif",
//           }}>
//             See Sample Output
//           </button>
//         </div>
//       </section>

//       {/* STATS */}
//       <section style={{
//         borderTop: "1px solid #111", borderBottom: "1px solid #111",
//         padding: "48px 24px",
//       }}>
//         <div style={{
//           maxWidth: 900, margin: "0 auto",
//           display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0
//         }}>
//           {[
//             { n: 15000, s: "+", label: "Transcripts Processed" },
//             { n: 500, s: "+", label: "University Formats" },
//             { n: 99, s: "%", label: "Accuracy Rate" },
//             { n: 45, s: "sec", label: "Avg. Processing Time" },
//           ].map((s, i) => (
//             <div key={s.label} className="stat-card" style={{
//               borderRight: i < 3 ? "1px solid #111" : "none"
//             }}>
//               <div style={{
//                 fontSize: 36, fontWeight: 800, fontFamily: "'Syne', sans-serif",
//                 color: "#fff", marginBottom: 6
//               }}>
//                 <AnimatedCounter target={s.n} suffix={s.s} />
//               </div>
//               <div style={{ color: "#444", fontSize: 13 }}>{s.label}</div>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* TOOL SECTION */}
//       <section ref={toolRef} style={{ padding: "100px 24px", maxWidth: 760, margin: "0 auto" }}>
//         <div style={{ textAlign: "center", marginBottom: 56 }}>
//           <h2 style={{
//             fontSize: 38, fontFamily: "'Syne', sans-serif",
//             fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
//           }}>Try it now — free</h2>
//           <p style={{ color: "#555", fontSize: 16 }}>No signup required. Upload, convert, download.</p>
//         </div>

//         <div style={{
//           background: "#0d0d0d",
//           border: "1px solid #1a1a1a",
//           borderRadius: 20,
//           padding: "48px 40px",
//         }}>
//           <StepIndicator current={step} />

//           {step === 0 && <UploadZone uploadFile={uploadFile} />}
//           {step === 1 && <ProcessingView onDone={() => setStep(2)} />}
//           {step === 2 && <ReviewView onDownload={() => setStep(3)} generatePDF={generatePDF} courses={courses} university={university} />}
//           {step === 3 && <DownloadView onReset={reset} />}
//         </div>
//       </section>

//       {/* FEATURES */}
//       <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
//         <div style={{ textAlign: "center", marginBottom: 60 }}>
//           <h2 style={{
//             fontSize: 38, fontFamily: "'Syne', sans-serif",
//             fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
//           }}>Everything you need</h2>
//           <p style={{ color: "#555", fontSize: 16 }}>Built specifically for students applying to US and Canadian universities</p>
//         </div>

//         <div style={{
//           display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20
//         }}>
//           {FEATURES.map(f => (
//             <div key={f.title} className="feature-card">
//               <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
//               <h3 style={{
//                 fontSize: 17, fontWeight: 700, fontFamily: "'Syne', sans-serif",
//                 marginBottom: 10, letterSpacing: -0.3
//               }}>{f.title}</h3>
//               <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* HOW IT WORKS */}
//       <section style={{
//         padding: "80px 24px",
//         borderTop: "1px solid #111",
//         maxWidth: 900, margin: "0 auto"
//       }}>
//         <div style={{ textAlign: "center", marginBottom: 60 }}>
//           <h2 style={{
//             fontSize: 38, fontFamily: "'Syne', sans-serif",
//             fontWeight: 800, letterSpacing: -1.5, marginBottom: 12
//           }}>How it works</h2>
//         </div>

//         <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, position: "relative" }}>
//           {[
//             { n: "01", title: "Upload", desc: "Drop your transcript in any format — PDF, image, CSV" },
//             { n: "02", title: "Extract", desc: "AI reads all courses, grades, and credit hours" },
//             { n: "03", title: "Convert", desc: "We apply WES grading tables and normalize credits" },
//             { n: "04", title: "Download", desc: "Get a polished WES-format PDF, ready to submit" },
//           ].map((s, i) => (
//             <div key={s.n} style={{
//               padding: "0 20px", textAlign: "center",
//               borderRight: i < 3 ? "1px solid #1a1a1a" : "none"
//             }}>
//               <div style={{
//                 width: 48, height: 48, borderRadius: "50%",
//                 background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)",
//                 display: "flex", alignItems: "center", justifyContent: "center",
//                 color: "#00C896", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
//                 margin: "0 auto 20px"
//               }}>{s.n}</div>
//               <h3 style={{
//                 fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif",
//                 marginBottom: 10
//               }}>{s.title}</h3>
//               <p style={{ color: "#444", fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* CTA */}
//       <section style={{
//         padding: "100px 24px", textAlign: "center",
//         borderTop: "1px solid #111",
//       }}>
//         <div style={{
//           maxWidth: 600, margin: "0 auto",
//           background: "linear-gradient(135deg, rgba(0,200,150,0.05), rgba(0,168,120,0.02))",
//           border: "1px solid rgba(0,200,150,0.1)",
//           borderRadius: 24, padding: "60px 48px"
//         }}>
//           <h2 style={{
//             fontSize: 40, fontFamily: "'Syne', sans-serif",
//             fontWeight: 800, letterSpacing: -1.5, marginBottom: 16
//           }}>Ready to get started?</h2>
//           <p style={{ color: "#555", fontSize: 16, marginBottom: 36 }}>
//             Join thousands of students who have simplified their WES application process.
//           </p>
//           <button onClick={scrollToTool} style={{
//             padding: "16px 40px", borderRadius: 12,
//             background: "linear-gradient(135deg, #00C896, #00A878)",
//             border: "none", color: "#0a0a0a",
//             fontSize: 16, fontWeight: 700, cursor: "pointer",
//             fontFamily: "'Syne', sans-serif",
//           }}>
//             Convert Transcript Free →
//           </button>
//         </div>
//       </section>

//       {/* FOOTER */}
//       <footer style={{
//         borderTop: "1px solid #111",
//         padding: "40px 24px",
//         display: "flex", alignItems: "center", justifyContent: "space-between",
//         maxWidth: 1100, margin: "0 auto",
//         flexWrap: "wrap", gap: 16
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//           <div style={{
//             width: 24, height: 24, borderRadius: 6,
//             background: "linear-gradient(135deg, #00C896, #00856A)",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             fontSize: 12
//           }}>📑</div>
//           <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>TranscriptIQ</span>
//         </div>
//         <div style={{ display: "flex", gap: 24 }}>
//           {["Privacy", "Terms", "Contact"].map(l => (
//             <span key={l} className="nav-link" style={{ fontSize: 13 }}>{l}</span>
//           ))}
//         </div>
//         <div style={{ color: "#333", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
//           © 2025 TranscriptIQ
//         </div>
//       </footer>
//     </div>
//   );
// }
