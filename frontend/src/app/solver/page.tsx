"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Atom, Upload, Image as ImageIcon, FileText, CheckCircle, Lightbulb, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { solverApi } from "@/lib/api";
import { translations, type Language } from "@/lib/translations";

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const savedLang = localStorage.getItem("lang") as Language;
    if (savedLang === "en" || savedLang === "si" || savedLang === "ta") {
      setLang(savedLang);
    }

    const handleLanguageChange = () => {
      const currentLang = localStorage.getItem("lang") as Language;
      if (currentLang === "en" || currentLang === "si" || currentLang === "ta") {
        setLang(currentLang);
      }
    };

    window.addEventListener("languageChange", handleLanguageChange);
    return () => {
      window.removeEventListener("languageChange", handleLanguageChange);
    };
  }, [router]);

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSolution(null);
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
    setError("");
  };

  const t = translations[lang] || translations.en;

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="px-6 py-4 glass-panel border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white">
          <Atom className="w-6 h-6 text-blue-400" />
          <span>{t.title} <span className="text-blue-400">{t.tutor}</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <select 
            value={lang} 
            onChange={(e) => handleLangChange(e.target.value as Language)}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs rounded-full px-3 py-1.5 focus:outline-none transition-all cursor-pointer font-medium"
          >
            <option value="en" className="bg-slate-900 text-white">English</option>
            <option value="si" className="bg-slate-900 text-white">සිංහල</option>
            <option value="ta" className="bg-slate-900 text-white">தமிழ்</option>
          </select>
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-semibold uppercase">
            {lang === "en" ? "OCR Solver" : lang === "si" ? "ප්‍රශ්න පත්‍ර විසඳනය" : "வினாத்தாள் தீர்ப்பான்"}
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Upload zone (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Mode Switcher */}
          <div className="glass-panel p-1.5 rounded-xl grid grid-cols-2 text-center text-sm font-semibold">
            <button 
              onClick={() => { setMode("past_paper"); setSolution(null); }}
              className={`py-2 rounded-lg transition-all ${mode === "past_paper" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
            >
              {lang === "en" ? "Past Paper Matching" : lang === "si" ? "ප්‍රශ්න පත්‍ර ගැලපීම" : "வினாத்தாள் பொருத்தம்"}
            </button>
            <button 
              onClick={() => { setMode("diagram"); setSolution(null); }}
              className={`py-2 rounded-lg transition-all ${mode === "diagram" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
            >
              {lang === "en" ? "Diagram & Visual Math" : lang === "si" ? "රූප සටහන් සහ දෘශ්‍ය ගණිතය" : "வரைபடம் மற்றும் கணிதம்"}
            </button>
          </div>

          {/* Upload card */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="glass-panel p-6 rounded-2xl border border-dashed border-white/10 hover:border-blue-500/30 transition-all flex flex-col items-center justify-center min-h-[300px] text-center"
          >
            {preview ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5">
                <img src={preview} alt="Upload preview" className="w-full h-full object-contain" />
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-16 h-16 text-cyan-400" />
                <span className="text-sm text-white font-bold">{file.name}</span>
                <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-full bg-white/5 border border-white/5">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-bold text-white text-sm">
                  {lang === "en" ? "Upload question photo / PDF" : lang === "si" ? "ප්‍රශ්නය සහිත ඡායාරූපය / PDF අප්ලෝඩ් කරන්න" : "வினா புகைப்படம் / PDF ஐ பதிவேற்றவும்"}
                </h3>
                <p className="text-xs text-gray-500 max-w-[250px]">
                  {lang === "en" ? "Drag and drop a screenshot or click to browse files (JPEG, PNG, WebP, PDF)" : 
                   lang === "si" ? "ස්ක්‍රීන්ෂොට් එකක් මෙතැනට ඇද දමන්න හෝ බ්‍රවුස් කරන්න (JPEG, PNG, WebP, PDF)" : 
                   "ஸ்கிரீன்ஷாட்டை இழுத்து விடவும் அல்லது கோப்புகளைத் தேடவும் (JPEG, PNG, WebP, PDF)"}
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
                className="mt-6 px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white rounded-lg cursor-pointer transition-all"
              >
                {lang === "en" ? "Browse Files" : lang === "si" ? "ගොනු බ්‍රවුස් කරන්න" : "கோப்புகளைத் தேடுக"}
              </label>
            ) : (
              <div className="flex items-center gap-2.5 mt-6">
                <button 
                  onClick={clearSelection}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-xs text-gray-400 hover:text-white transition-all"
                >
                  {lang === "en" ? "Clear File" : lang === "si" ? "ගොනුව ඉවත් කරන්න" : "கோப்பை நீக்குக"}
                </button>
                <button 
                  onClick={handleSolve}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg shadow-md shadow-blue-500/25 transition-all"
                >
                  {t.solve}
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Side: Solutions display (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {loading && (
            <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px]">
              <Atom className="w-16 h-16 text-blue-500 animate-spin mb-4" />
              <h3 className="font-bold text-white">
                {lang === "en" ? "Quantum Solver In Action" : lang === "si" ? "විසඳනය ක්‍රියාත්මකයි" : "தீர்ப்பான் செயல்பாட்டில் உள்ளது"}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                {lang === "en" ? "We are scanning the image, analyzing visual diagrams, and pulling similar past papers from Qdrant." : 
                 lang === "si" ? "අපි රූපය ස්කෑන් කරමින්, රූප සටහන් විශ්ලේෂණය කරමින් Qdrant මඟින් සමාන ප්‍රශ්න පත්‍ර සොයමින් සිටිමු." : 
                 "நாங்கள் படத்தை ஸ்கேன் செய்து, வரைபடங்களை பகுப்பாய்வு செய்து, Qdrant இலிருந்து ஒத்த வினாத்தாள்களை மீட்டெடுக்கிறோம்."}
              </p>
            </div>
          )}

          {!loading && !solution && (
            <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px]">
              <Lightbulb className="w-12 h-12 text-gray-500/20 mb-4 animate-pulse" />
              <h3 className="font-bold text-white text-base">
                {lang === "en" ? "Solution Output" : lang === "si" ? "විසඳුම් ප්‍රතිදානය" : "தீர்வு வெளியீடு"}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                {lang === "en" ? "Upload your physics question screenshot and press solve. The complete visual derivation and score allocation will render here." : 
                 lang === "si" ? "ඔබගේ ප්‍රශ්නයේ ඡායාරූපය අප්ලෝඩ් කර විසඳන්න බටනය ඔබන්න. පියවරෙන් පියවර විසඳුම සහ ලකුණු බෙදී යන ආකාරය මෙහි දැක්වෙනු ඇත." : 
                 "உங்கள் கேள்வியின் ஸ்கிரீன்ஷாட்டைப் பதிவேற்றி தீர்க்கவும். முழுமையான தீர்வு மற்றும் புள்ளி விவரங்கள் இங்கே காண்பிக்கப்படும்."}
              </p>
            </div>
          )}

          {!loading && solution && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6"
            >
              
              {/* Question metadata header */}
              <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] tracking-wider uppercase font-bold text-cyan-400">
                    {lang === "en" ? "Classified Area" : lang === "si" ? "වර්ගීකෘත ක්ෂේත්‍රය" : "வகைப்படுத்தப்பட்ட பகுதி"}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{solution.detected_chapter}</h3>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs px-2.5 py-1 rounded bg-white/5 border border-white/5 text-gray-400 font-semibold">
                    {lang === "en" ? "Format" : lang === "si" ? "ආකෘතිය" : "வடிவம்"}: {solution.question_type}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
                    {lang === "en" ? "Confidence" : lang === "si" ? "විශ්වාසනීයත්වය" : "நம்பகத்தன்மை"}: {Math.round(solution.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Extracted Text */}
              <div className="glass-panel p-5 rounded-2xl">
                <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">
                  {lang === "en" ? "Parsed Question (OCR)" : lang === "si" ? "ප්‍රශ්න පෙළ (OCR)" : "கேள்வி உரை (OCR)"}
                </h4>
                <p className="text-sm text-gray-300 italic leading-relaxed whitespace-pre-wrap">{solution.extracted_text}</p>
              </div>

              {/* Step-by-step layout */}
              <div className="glass-panel p-6 rounded-2xl">
                <h4 className="text-xs uppercase font-bold text-blue-400 tracking-wider mb-4">
                  {lang === "en" ? "Step-by-Step Derivation" : lang === "si" ? "පියවරෙන් පියවර ව්‍යුත්පන්නය" : "படிப்படியான தீர்வு"}
                </h4>
                <div className="flex flex-col gap-4">
                  {solution.solution_steps?.map((step: string, index: number) => (
                    <div key={index} className="flex gap-4">
                      <span className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 text-xs font-bold text-blue-300 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-sm text-gray-300 leading-relaxed font-sans">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Answer glowing block */}
              <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/5 text-center">
                <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-1">
                  {lang === "en" ? "Final Result" : lang === "si" ? "අවසන් පිළිතුර" : "இறுதி முடிவு"}
                </h4>
                <span className="text-xl font-bold text-white tracking-wide text-glow-blue">{solution.final_answer}</span>
              </div>

              {/* Marking allocation */}
              {solution.marks_allocation && (
                <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-purple-950/5">
                  <h4 className="text-xs uppercase font-bold text-purple-400 tracking-wider mb-3">
                    {lang === "en" ? "Marks & Grading Allocation" : lang === "si" ? "ලකුණු සහ ශ්‍රේණිගත කිරීම් බෙදාහැරීම" : "புள்ளிகள் ஒதுக்கீடு விபரம்"}
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans bg-black/20 p-4 rounded-xl">
                    {solution.marks_allocation}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
