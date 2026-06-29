"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Atom, Upload, Image as ImageIcon, FileText, CheckCircle, Lightbulb, 
  AlertTriangle, ArrowRight, ShieldAlert, Zap, Compass, RefreshCw, Bookmark 
} from "lucide-react";
import { solverApi } from "@/lib/api";
import { translations, type Language } from "@/lib/translations";
import WorkspaceLayout from "@/components/WorkspaceLayout";
import { getUserStats, rewardXP, addBookmark, getBookmarks, type UserStats } from "@/lib/gamification";

export default function Solver() {
  const router = useRouter();
  
  // App States
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<"past_paper" | "diagram">("past_paper");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [solution, setSolution] = useState<any>(null);
  const [lang, setLang] = useState<Language>("en");
  
  // Custom interactive solver settings
  const [explainLevel, setExplainLevel] = useState<"none" | "formula" | "why" | "alternative" | "mistakes">("none");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const savedBookmarks = getBookmarks();
    setSavedIds(savedBookmarks.map(b => b.title));

    const savedLang = localStorage.getItem("lang") as Language;
    if (savedLang) setLang(savedLang);

    const handleLanguage = () => {
      const currentLang = localStorage.getItem("lang") as Language;
      if (currentLang) setLang(currentLang);
    };

    window.addEventListener("languageChange", handleLanguage);
    return () => window.removeEventListener("languageChange", handleLanguage);
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSolution(null);
    setExplainLevel("none");
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      setError(lang === "en" ? "File exceeds the 10MB limit." : lang === "si" ? "ගොනුව 10MB සීමාව ඉක්මවයි." : "கோப்பு 10MB வரம்பை மீறுகிறது.");
      return;
    }

    setFile(selected);

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const handleSolve = async () => {
    if (!file) {
      setError(lang === "en" ? "Please select a photo or PDF first." : lang === "si" ? "කරුණාකර පළමුව ඡායාරූපයක් හෝ PDF එකක් තෝරන්න." : "தயவுசெய்து முதலில் ஒரு புகைப்படம் அல்லது PDF ஐத் தேர்ந்தெடுக்கவும்.");
      return;
    }

    setError("");
    setLoading(true);
    setSolution(null);
    setExplainLevel("none");

    const mediumMap: Record<Language, string> = {
      en: "english",
      si: "sinhala",
      ta: "tamil"
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("medium", mediumMap[lang] || "english");

    try {
      let res;
      if (mode === "past_paper") {
        res = await solverApi.solvePastPaper(formData);
      } else {
        res = await solverApi.solveImage(formData);
      }
      setSolution(res);
      rewardXP(25); // Reward 25 XP for solving a physics paper OCR diagram!
    } catch (err: any) {
      setError(err.message || "Failed to analyze and solve question.");
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError("");
    setSolution(null);
    setExplainLevel("none");

    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;

    if (dropped.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB.");
      return;
    }

    setFile(dropped);
    if (dropped.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(dropped);
    } else {
      setPreview(null);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
    setSolution(null);
    setExplainLevel("none");
    setError("");
  };

  const handleBookmarkSave = () => {
    if (!solution) return;
    const title = `OCR Solution: ${solution.detected_chapter}`;
    if (savedIds.includes(title)) return;
    
    addBookmark("solution", title, solution);
    setSavedIds(prev => [...prev, title]);
    rewardXP(10);
  };

  const t = translations[lang] || translations.en;

  return (
    <WorkspaceLayout>
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Header summary */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-400" />
            <span>AI diagram & Past Paper Solver</span>
          </h1>
          <p className="text-xs text-gray-400 leading-normal">
            Analyze exam diagrams, extract mathematical derivations, and grade marks using OCR vision.
          </p>
        </div>

        {/* Main Work Grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
          
          {/* Left panel: Upload and configs (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Mode toggle */}
            <div className="glass-panel p-1 rounded-xl grid grid-cols-2 text-center text-xs font-bold uppercase tracking-wider">
              <button 
                onClick={() => { setMode("past_paper"); setSolution(null); }}
                className={`py-2.5 rounded-lg transition-all cursor-pointer ${mode === "past_paper" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-white"}`}
              >
                Past Paper matching
              </button>
              <button 
                onClick={() => { setMode("diagram"); setSolution(null); }}
                className={`py-2.5 rounded-lg transition-all cursor-pointer ${mode === "diagram" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-white"}`}
              >
                Visual diagram math
              </button>
            </div>

            {/* Drag & Drop scanner */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="glass-panel p-6 rounded-2xl border border-dashed border-white/10 hover:border-blue-500/20 transition-all flex flex-col items-center justify-center min-h-[300px] text-center relative overflow-hidden bg-black/10"
            >
              {preview ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center">
                  <img src={preview} alt="Upload preview" className="w-full h-full object-contain" />
                  
                  {/* Laser scan lines overlay (Only visible when loading) */}
                  {loading && (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none">
                      <div className="w-full h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse absolute left-0" style={{
                        animation: "scan 2s linear infinite",
                        top: 0
                      }} />
                      <style>{`
                        @keyframes scan {
                          0% { top: 0%; }
                          50% { top: 100%; }
                          100% { top: 0%; }
                        }
                      `}</style>
                    </div>
                  )}
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-14 h-14 text-cyan-400" />
                  <span className="text-xs text-white font-bold max-w-[200px] truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3.5 rounded-full bg-white/5 border border-white/5">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-white text-xs">
                    Upload A/L Physics question image / PDF
                  </h3>
                  <p className="text-[10px] text-gray-500 max-w-[240px] leading-normal">
                    Drag and drop your screenshot diagram or click to browse folders (JPEG, PNG, WebP, PDF)
                  </p>
                </div>
              )}

              <input 
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                id="file-upload"
                className="hidden"
              />
              
              {!file ? (
                <label 
                  htmlFor="file-upload"
                  className="mt-6 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer transition-all"
                >
                  Browse Files
                </label>
              ) : (
                <div className="flex items-center gap-2 mt-6">
                  <button 
                    onClick={clearSelection}
                    className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-[10px] uppercase font-bold tracking-wider text-gray-400 hover:text-white transition-all"
                  >
                    Clear Selection
                  </button>
                  <button 
                    onClick={handleSolve}
                    disabled={loading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-[10px] uppercase font-bold tracking-wider text-white rounded-xl shadow-md shadow-blue-500/25 transition-all"
                  >
                    {loading ? "Scanning..." : t.solve}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right panel: Solutions & Metadata details (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {loading && (
              <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px]">
                <Atom className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                <h3 className="font-bold text-white text-sm">Processing OCR Vision Grader</h3>
                <div className="flex flex-col gap-1 mt-2 text-xs text-gray-500 max-w-[280px]">
                  <p>• Extracting physics formulas and vector math...</p>
                  <p>• Classifying A/L syllabus chapter alignments...</p>
                  <p>• Retrieving past marking guidelines...</p>
                </div>
              </div>
            )}

            {!loading && !solution && (
              <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px]">
                <Lightbulb className="w-10 h-10 text-gray-500/20 mb-4 animate-pulse" />
                <h3 className="font-bold text-white text-sm">Graded Solution output</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-[280px] leading-relaxed">
                  Upload an image snapshot of your physics paper question and press solve. The complete visual calculation steps and mark allocations will populate here.
                </p>
              </div>
            )}

            {!loading && solution && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-6"
              >
                
                {/* Meta details dashboard summary header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block">Syllabus Area</span>
                    <span className="text-xs font-bold text-white truncate block mt-0.5">{solution.detected_chapter}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block">Difficulty</span>
                    <span className="text-xs font-bold text-amber-400 block mt-0.5">Medium A/L</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block">Expected Marks</span>
                    <span className="text-xs font-bold text-emerald-400 block mt-0.5">15 Marks</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block">Solve Time</span>
                    <span className="text-xs font-bold text-blue-400 block mt-0.5">8 Minutes</span>
                  </div>
                </div>

                {/* Parsed question text */}
                <div className="glass-panel p-5 rounded-2xl">
                  <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Extracted Question Text</h4>
                  <p className="text-xs text-gray-400 italic leading-relaxed whitespace-pre-wrap">{solution.extracted_text}</p>
                </div>

                {/* Visual steps layout */}
                <div className="glass-panel p-6 rounded-2xl">
                  <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-wider mb-4">Step-by-Step AI Solution</h4>
                  <div className="flex flex-col gap-4">
                    {solution.solution_steps?.map((step: string, index: number) => (
                      <div key={index} className="flex gap-4">
                        <span className="w-5 h-5 rounded-full bg-blue-600/10 border border-blue-500/20 text-[10px] font-bold text-blue-300 flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <p className="text-xs text-gray-300 leading-relaxed font-sans">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final answer highlighted box */}
                <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/5 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1 block">Final answer result</span>
                  <span className="text-lg font-mono font-bold text-white tracking-wide text-glow-blue">{solution.final_answer}</span>
                </div>

                {/* Mark schemes */}
                {solution.marks_allocation && (
                  <div className="glass-panel p-5 rounded-2xl border border-purple-500/15 bg-purple-950/5">
                    <h4 className="text-[10px] uppercase font-bold text-purple-400 tracking-wider mb-2">Grading breakdown</h4>
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans bg-black/20 p-4 rounded-xl">
                      {solution.marks_allocation}
                    </p>
                  </div>
                )}

                {/* 5. Solver Action Buttons options panel */}
                <div className="flex flex-col gap-3.5 border-t border-white/5 pt-4">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Solution Controls</span>
                  
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setExplainLevel("why")}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition-all ${explainLevel === "why" ? "bg-cyan-600 text-white border-cyan-500" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
                    >
                      Why this formula?
                    </button>
                    <button 
                      onClick={() => setExplainLevel("alternative")}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition-all ${explainLevel === "alternative" ? "bg-cyan-600 text-white border-cyan-500" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
                    >
                      Alternative Method
                    </button>
                    <button 
                      onClick={() => setExplainLevel("mistakes")}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition-all ${explainLevel === "mistakes" ? "bg-cyan-600 text-white border-cyan-500" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
                    >
                      Common Pitfalls
                    </button>
                    <button 
                      onClick={handleBookmarkSave}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition-all flex items-center gap-1 ${savedIds.includes(`OCR Solution: ${solution.detected_chapter}`) ? "bg-cyan-600 text-white border-cyan-500" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
                    >
                      <Bookmark className="w-3 h-3" />
                      <span>{savedIds.includes(`OCR Solution: ${solution.detected_chapter}`) ? "Bookmarked" : "Bookmark Solution"}</span>
                    </button>
                    <button 
                      onClick={clearSelection}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white text-[10px] transition-all"
                    >
                      Next Question
                    </button>
                  </div>

                  {/* Dynamically generated explanations block */}
                  <AnimatePresence>
                    {explainLevel !== "none" && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 rounded-xl bg-cyan-950/10 border border-cyan-500/10 text-xs text-gray-300 leading-relaxed font-sans mt-1"
                      >
                        {explainLevel === "why" && (
                          <p><strong>Formula selection logic:</strong> In straight-line kinematics with constant gravitational pull (like projectile motion or free-fall drop), equations of motion (v = u + at, s = ut + ½at²) are selected because acceleration is uniform and air drag vectors are disregarded under Sri Lankan Advanced Level syllabus limits.</p>
                        )}
                        {explainLevel === "alternative" && (
                          <p><strong>Alternative conservation method:</strong> Instead of equations of motion, you can use the Work-Energy Theorem. Kinetic Energy increase equals Potential Energy lost: ½mv² = mgh. Mass (m) cancels out, leaving: v = √(2gh). This yields the identical final velocity value in fewer steps.</p>
                        )}
                        {explainLevel === "mistakes" && (
                          <p><strong>Common student pitfalls:</strong> Students frequently mix signs (+ / -) when coordinate axes switch directions (e.g., throwing a ball upwards against gravity). Always define one clear vector direction (up or down) as positive at the start of calculations.</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </motion.div>
            )}

          </div>

        </div>

      </div>
    </WorkspaceLayout>
  );
}
