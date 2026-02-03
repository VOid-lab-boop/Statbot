import { useState, useRef, useCallback } from "react";

// ─── ANALYSIS CATEGORIES ────────────────────────────────────
const CATEGORIES = [
  {
    label: "Regression",
    icon: "📈",
    analyses: [
      { id: "linear_reg", name: "Linear Regression", desc: "Predict a continuous outcome from one or more predictors" },
      { id: "logistic_reg", name: "Logistic Regression", desc: "Predict a binary outcome (yes/no) from predictors" },
    ],
  },
  {
    label: "Group Comparisons",
    icon: "⚖️",
    analyses: [
      { id: "anova", name: "ANOVA", desc: "Compare means across 3+ groups (one factor)" },
      { id: "manova", name: "MANOVA", desc: "Compare multiple outcomes across groups simultaneously" },
      { id: "ancova", name: "ANCOVA", desc: "Compare group means while controlling for a covariate" },
      { id: "mancova", name: "MANCOVA", desc: "MANOVA with one or more covariates controlled" },
    ],
  },
  {
    label: "Factor & Scale Analysis",
    icon: "🔬",
    analyses: [
      { id: "efa", name: "Exploratory Factor Analysis", desc: "Discover latent factors from observed variables" },
      { id: "cfa", name: "Confirmatory Factor Analysis", desc: "Test a hypothesized factor structure against data" },
      { id: "bifactor_cfa", name: "Bifactor CFA", desc: "General + specific factors with orthogonality constraints" },
    ],
  },
  {
    label: "Structural Modeling",
    icon: "🗺️",
    analyses: [
      { id: "sem", name: "Structural Equation Modeling", desc: "Test complex causal relationships with latent variables" },
      { id: "path", name: "Path Analysis", desc: "Direct & indirect effects between observed variables" },
    ],
  },
  {
    label: "Item & Psychometric",
    icon: "📏",
    analyses: [
      { id: "rasch", name: "Rasch Analysis", desc: "Unidimensional measurement: item difficulty & discrimination" },
      { id: "irt", name: "Item Response Theory", desc: "1PL / 2PL / 3PL models for item & person parameters" },
    ],
  },
  {
    label: "Time Series",
    icon: "📊",
    analyses: [
      { id: "timeseries", name: "Time Series Analysis", desc: "Forecasting, decomposition, ARIMA for sequential data" },
    ],
  },
];

const ALL_ANALYSES = CATEGORIES.flatMap(c => c.analyses);

// ─── SYSTEM PROMPT ──────────────────────────────────────────
function buildSystemPrompt(analysisType, dataInfo, fileName, isSav) {
  const sel = ALL_ANALYSES.find(a => a.id === analysisType);
  const loadLine = isSav
    ? `library(haven)\ndata <- as.data.frame(read_sav("${fileName}"))`
    : `data <- read.csv("${fileName}")`;

  return `You are StatBot, a precision R-code generator for academic researchers. Your ONLY job is to produce correct, ready-to-paste R code.

RULES:
1. Output ONLY R code. No explanations, no markdown fences. Pure R code only.
2. The code must be ONE complete block the user pastes into R/RStudio and runs.
3. Be extremely precise with formulas. For psychometric indices (omega, ECV, PUC, H) use Rodriguez, Reise & Haviland (2016). For IRT use standard parameterizations. Never guess.
4. Use this exact line to load the data:
${loadLine}
5. Install required packages automatically at the top with if(!require(...)) install.packages(...).
6. Print all results clearly with labels. Save output to a .txt file in the same directory using sink().
7. Use ONLY column names that appear in the data preview or that the user explicitly describes. Never invent variable names.
8. For ordinal/Likert data, treat variables as ordered factors unless told otherwise.
9. Add clear comments throughout the code explaining each section.
10. If the file is .sav, use haven::read_sav() and handle labels/factors appropriately.

Selected Analysis: ${sel ? sel.name : "General"}
Data Info:
${dataInfo}`;
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [file, setFile] = useState(null);
  const [dataPreview, setDataPreview] = useState("");
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [userQuery, setUserQuery] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const fileInputRef = useRef(null);

  // ── Parse file on upload ──
  const handleFileUpload = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError(null);
    setGeneratedCode("");
    setDataPreview("");

    const ext = f.name.split(".").pop().toLowerCase();

    if (ext === "csv") {
      setFile({ name: f.name, size: f.size, type: "csv" });
      const reader = new FileReader();
      reader.onload = (evt) => {
        const lines = evt.target.result.split("\n").slice(0, 9);
        setDataPreview(lines.join("\n"));
      };
      reader.readAsText(f);
    } else if (ext === "sav") {
      setFile({ name: f.name, size: f.size, type: "sav" });
      setDataPreview("");
    } else {
      setError("Unsupported file. Please upload .csv or .sav.");
    }
  }, []);

  // ── Build data info for the AI prompt ──
  const getDataInfo = () => {
    if (file?.type === "csv" && dataPreview) {
      return `File: ${file.name} (CSV)\nPreview (first 8 rows):\n${dataPreview}`;
    }
    if (file?.type === "sav") {
      return `File: ${file.name} (SPSS .sav)\nThis is an SPSS binary file. The R code will use haven::read_sav() to load it natively. The user must describe their variable/column names in their request so the code can reference them correctly.`;
    }
    return "";
  };

  // ── Call Claude API ──
  const handleGenerate = async () => {
    if (!file || !selectedAnalysis || !userQuery.trim()) return;
    setLoading(true);
    setError(null);
    setGeneratedCode("");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildSystemPrompt(selectedAnalysis, getDataInfo(), file.name, file.type === "sav"),
          messages: [{ role: "user", content: userQuery }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "API request failed");
      }

      const data = await response.json();
      const code = data.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n")
        .replace(/```r?\n?/gi, "")
        .replace(/```/g, "")
        .trim();

      setGeneratedCode(code);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Syntax highlighting ──
  const highlight = (txt) => {
    if (!txt) return "";
    return txt
      .replace(/(&|<|>)/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]))
      .replace(/(#.*)/g, '<span style="color:#5a6380;font-style:italic">$1</span>')
      .replace(/\b(library|require|install\.packages|if|else|for|in|function|return|TRUE|FALSE|NULL|NA|NaN|Inf)\b/g, '<span style="color:#c084fc">$1</span>')
      .replace(/\b(read\.csv|read_sav|as\.data\.frame|cfa|sem|lm|glm|aov|manova|summary|print|cat|sprintf|paste0|paste|c|data\.frame|matrix|factor|ordered|levels|as\.numeric|as\.character|as\.integer|sink|file|write\.csv|cor|mean|sd|var|nrow|ncol|names|str|head|subset|apply|lapply|sapply|aggregate|fitted|residuals|predict|coef|confint|anova|fitMeasures|standardizedEstimates|parameterEstimates|haven|lavaan|psych|mirt|semTools)\b/g, '<span style="color:#67e8f9">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')/g, '<span style="color:#86efac">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fbbf24">$1</span>');
  };

  const canGenerate = !!file && !!selectedAnalysis && !!userQuery.trim();

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ background: "#0a0b0f", color: "#e2e4ea", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* grain overlay */}
      <div style={{ position: "fixed", inset: 0, opacity: 0.025, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "200px" }}, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "40px 20px 70px" }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5, marginBottom: 6 }}>
            <span style={{ color: "#5eead4" }}>Stat</span><span style={{ color: "#e2e4ea" }}>Bot</span>
          </div>
          <p style={{ color: "#6b7280", fontSize: 13.5, margin: 0, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
            Upload your data, pick an analysis, describe what you need in plain English — get precise, copy-paste R code instantly.
          </p>
        </div>

        {/* ── STEP 1: UPLOAD ── */}
        <StepCard step="1" title="Upload Your Data" done={!!file}>
          {!file ? (
            <DropZone onFileSelect={() => fileInputRef.current?.click()} />
          ) : (
            <div>
              {/* file chip */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  background: file.type === "sav" ? "rgba(251,191,36,0.08)" : "rgba(94,234,212,0.08)",
                  border: `1px solid ${file.type === "sav" ? "rgba(251,191,36,0.3)" : "rgba(94,234,212,0.3)"}`,
                  borderRadius: 10, padding: "10px 16px", flex: 1, display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 22 }}>{file.type === "sav" ? "📊" : "📄"}</span>
                  <div>
                    <div style={{ fontSize: 13, color: file.type === "sav" ? "#fbbf24" : "#5eead4", fontWeight: 600 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{(file.size / 1024).toFixed(1)} KB · {file.type === "sav" ? "SPSS .sav" : "CSV"}</div>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); setDataPreview(""); setGeneratedCode(""); }}
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.28)", color: "#f87171", borderRadius: 8, padding: "7px 13px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                >Remove</button>
              </div>

              {/* CSV: show data preview */}
              {file.type === "csv" && dataPreview && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10.5, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>Data Preview</div>
                  <div style={{ background: "#0d0e12", borderRadius: 8, padding: "11px 13px", overflowX: "auto", border: "1px solid #1a1c24" }}>
                    <pre style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontFamily: "'Fira Code', 'Consolas', monospace", lineHeight: 1.75 }}>{dataPreview}</pre>
                  </div>
                </div>
              )}

              {/* SAV: friendly guide */}
              {file.type === "sav" && (
                <div style={{ marginTop: 14, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600, marginBottom: 7 }}>📌 SPSS File Detected</div>
                  <div style={{ color: "#9ca3af", fontSize: 12.5, lineHeight: 1.75 }}>
                    The generated R code will load your .sav file directly using{" "}
                    <code style={{ color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "2px 6px", borderRadius: 4, fontSize: 11.5 }}>haven::read_sav()</code>
                    {" "}— no conversion needed.
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 12.5, lineHeight: 1.75, marginTop: 7 }}>
                    👉 In <strong style={{ color: "#e2e4ea" }}>Step 3 below</strong>, describe your variable names so the code references them correctly.
                    For example: <em style={{ color: "#6b7280" }}>"Items are named SE1 to SE43"</em> or <em style={{ color: "#6b7280" }}>"The outcome variable is called GPA"</em>.
                  </div>
                </div>
              )}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".csv,.sav" onChange={handleFileUpload} style={{ display: "none" }} />
        </StepCard>

        {/* ── STEP 2: PICK ANALYSIS ── */}
        <StepCard step="2" title="Select Analysis Type" done={!!selectedAnalysis}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {CATEGORIES.map((cat, ci) => {
              const isOpen = expandedCat === ci;
              const hasSelected = cat.analyses.some(a => a.id === selectedAnalysis);
              return (
                <div key={ci}>
                  <button
                    onClick={() => setExpandedCat(isOpen ? null : ci)}
                    style={{
                      width: "100%", textAlign: "left",
                      background: isOpen || hasSelected ? "rgba(94,234,212,0.05)" : "#111318",
                      border: `1px solid ${isOpen || hasSelected ? "rgba(94,234,212,0.28)" : "#1e2030"}`,
                      borderRadius: 10, padding: "11px 15px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      color: "#e2e4ea", fontSize: 13, fontWeight: 600, transition: "all 0.2s",
                    }}
                  >
                    <span>
                      <span style={{ marginRight: 8 }}>{cat.icon}</span>
                      {cat.label}
                      {hasSelected && <span style={{ color: "#5eead4", fontSize: 10, marginLeft: 8 }}>✓</span>}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 10, display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
                  </button>
                  {isOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "7px 0 3px 10px" }}>
                      {cat.analyses.map(a => {
                        const picked = selectedAnalysis === a.id;
                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelectedAnalysis(a.id)}
                            style={{
                              background: picked ? "rgba(94,234,212,0.1)" : "transparent",
                              border: `1px solid ${picked ? "#5eead4" : "transparent"}`,
                              borderRadius: 8, padding: "9px 13px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { if (!picked) e.currentTarget.style.background = "rgba(255,255,255,0.035)"; }}
                            onMouseLeave={e => { if (!picked) e.currentTarget.style.background = "transparent"; }}
                          >
                            <div style={{ color: picked ? "#5eead4" : "#e2e4ea", fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                            <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{a.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </StepCard>

        {/* ── STEP 3: DESCRIBE ── */}
        <StepCard step="3" title="Describe What You Want" done={!!userQuery.trim()}>
          <textarea
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
            placeholder={
              file?.type === "sav"
                ? 'Example: "I have a self-efficacy scale with 43 items named SE1 to SE43 on a 5-point Likert scale, distributed across 5 subscales: (a) Personal and Social Development (SE1–SE12), (b) Leadership and Assessment (SE13–SE21)... I want bifactor CFA using WLSMV. Compute all omega indices and save results."'
                : 'Example: "Predict student GPA using study_hours, attendance, and prior_score as predictors. Include diagnostics and confidence intervals. Save output to a text file."'
            }
            style={{
              width: "100%", boxSizing: "border-box", background: "#111318", border: "1px solid #1e2030", borderRadius: 10,
              color: "#e2e4ea", padding: "13px 15px", fontSize: 13, fontFamily: "inherit", lineHeight: 1.65,
              resize: "vertical", minHeight: 115, outline: "none", transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "#5eead4"}
            onBlur={e => e.target.style.borderColor = "#1e2030"}
          />
          <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 8, lineHeight: 1.6 }}>
            💡 Be specific — mention column/variable names, estimators, and what output you want.
            {file?.type === "sav" && <span style={{ color: "#fbbf24" }}> Since you uploaded a .sav, describe your variable names here so the code can use them.</span>}
          </div>
        </StepCard>

        {/* ── ERROR ── */}
        {error && (
          <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.28)", borderRadius: 10, padding: "11px 15px", color: "#f87171", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── GENERATE BUTTON ── */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            style={{
              background: loading || !canGenerate ? "#1e2030" : "linear-gradient(135deg, #5eead4 0%, #14b8a6 100%)",
              color: loading || !canGenerate ? "#6b7280" : "#0a0b0f",
              border: "none", borderRadius: 12, padding: "13px 34px", fontSize: 15, fontWeight: 700,
              cursor: loading || !canGenerate ? "not-allowed" : "pointer", transition: "all 0.2s",
              boxShadow: loading || !canGenerate ? "none" : "0 4px 22px rgba(94,234,212,0.22)",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            {loading ? <><Spinner /> Generating...</> : <>⚡ Generate R Code</>}
          </button>
        </div>

        {/* ── GENERATED CODE ── */}
        {generatedCode && (
          <div style={{ background: "#0d0e12", border: "1px solid rgba(94,234,212,0.22)", borderRadius: 14, overflow: "hidden", boxShadow: "0 0 28px rgba(94,234,212,0.05)" }}>
            {/* toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 17px", borderBottom: "1px solid #1a1c24", background: "#111318" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Dot color="#f87171" /><Dot color="#fbbf24" /><Dot color="#5eead4" />
                <span style={{ color: "#5a6380", fontSize: 11.5, marginLeft: 8, fontFamily: "'Fira Code', monospace" }}>output.R</span>
              </div>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "rgba(74,222,128,0.1)" : "rgba(94,234,212,0.08)",
                  border: `1px solid ${copied ? "rgba(74,222,128,0.35)" : "rgba(94,234,212,0.25)"}`,
                  color: copied ? "#4ade80" : "#5eead4",
                  borderRadius: 7, padding: "5px 13px", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s",
                }}
              >
                {copied ? "✓ Copied!" : "Copy Code"}
              </button>
            </div>
            {/* code body */}
            <div style={{ padding: "18px 20px", overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
              <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.85, fontFamily: "'Fira Code', 'Consolas', monospace", color: "#c8cad4", whiteSpace: "pre" }} dangerouslySetInnerHTML={{ __html: highlight(generatedCode) }} />
            </div>
            {/* how-to footer */}
            <div style={{ borderTop: "1px solid #1a1c24", padding: "11px 17px", background: "#111318" }}>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                <strong style={{ color: "#5eead4" }}>How to use:</strong> Click <em>Copy Code</em> → open <strong>RStudio</strong> → paste into a new script → press <strong>Run</strong>.
                {file?.type === "sav"
                  ? <span> Make sure your <code style={{ color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>.sav</code> file is in your R working directory, or update the file path in the code.</span>
                  : <span> Place your <code style={{ color: "#5eead4", background: "rgba(94,234,212,0.1)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>.csv</code> in your R working directory, or update the path in the code.</span>
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SMALL REUSABLE COMPONENTS ──────────────────────────────
function StepCard({ step, title, done, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: done ? "#5eead4" : "#1a1c24", color: done ? "#0a0b0f" : "#6b7280",
          fontSize: 13, fontWeight: 700, transition: "all 0.3s",
        }}>
          {done ? "✓" : step}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: done ? "#5eead4" : "#e2e4ea", transition: "color 0.3s" }}>{title}</div>
      </div>
      <div style={{ paddingLeft: 38 }}>{children}</div>
    </div>
  );
}

function DropZone({ onFileSelect }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onFileSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `2px dashed ${hover ? "#5eead4" : "#2a2d3a"}`,
        borderRadius: 12, padding: "34px 20px", textAlign: "center", cursor: "pointer",
        background: hover ? "rgba(94,234,212,0.04)" : "#111318", transition: "all 0.25s",
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 6 }}>📁</div>
      <div style={{ color: "#5eead4", fontSize: 14, fontWeight: 600 }}>Click to upload</div>
      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 3 }}>.csv or .sav (SPSS) supported</div>
    </div>
  );
}

function Dot({ color }) {
  return <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />;
}

function Spinner() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" style={{ animation: "spin 0.65s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#0a0b0f" strokeWidth="3" strokeDasharray="26 52" strokeLinecap="round" />
    </svg>
  );
}
