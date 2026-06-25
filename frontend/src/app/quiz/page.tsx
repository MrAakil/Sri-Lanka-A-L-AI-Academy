"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Atom, Timer, HelpCircle, CheckCircle2, AlertTriangle, XCircle, BarChart2, RotateCcw, ArrowRight } from "lucide-react";
import { quizApi } from "@/lib/api";
import confetti from "canvas-confetti";
import { translations, type Language } from "@/lib/translations";

const CHAPTER_LIST = [
  "Measurements", "Mechanics", "Waves", "Thermal Physics", "Electricity", 
  "Magnetism", "Electromagnetic Induction", "Electronics", "Modern Physics", "Nuclear Physics"
];

const CHAPTER_LIST_SI = [
  "මිනුම්", "යාන්ත්‍ර විද්‍යාව", "තරංග හා දෝලන", "තාප භෞතික විද්‍යාව", "ධාරා විද්‍යුතය", 
  "චුම්බක ක්ෂේත්‍ර", "විද්‍යුත් චුම්බක ප්‍රේරණය", "ඉලෙක්ට්‍රොනික විද්‍යාව", "නූතන භෞතික විද්‍යාව", "න්‍යෂ්ටික විද්‍යාව"
];

const CHAPTER_LIST_TA = [
  "அளவீடுகள்", "இயக்கவியல்", "அலைகளும் அசைவுகளும்", "வெப்பப் பௌதீகவியல்", "ஓட்ட மின்னியல்", 
  "காந்தப்புலம்", "மின்காந்தத் தூண்டல்", "மின்னணுவியல்", "நவீன பௌதீகவியல்", "கருக்கதிர் பௌதீகவியல்"
];

export default function QuizArena() {
  const router = useRouter();
  
  // App view state
  const [gameState, setGameState] = useState<"setup" | "running" | "submitting" | "results">("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<Language>("en");
  
  // Quiz parameters
  const [chapter, setChapter] = useState("Mechanics");
  const [difficulty, setDifficulty] = useState("easy");
  const [format, setFormat] = useState("MCQ");
  const [count, setCount] = useState(5);

  // Active quiz state
  const [quizId, setQuizId] = useState<number | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Grading state
  const [submission, setSubmission] = useState<any>(null);

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

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (gameState === "running" && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (gameState === "running" && timeLeft === 0) {
      handleSubmit(); // Auto-submit when time expires
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gameState]);

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  const handleStart = async () => {
    setError("");
    setLoading(true);

    const mediumMap: Record<Language, string> = {
      en: "english",
      si: "sinhala",
      ta: "tamil"
    };

    try {
      const quiz = await quizApi.generate({
        chapter,
        difficulty,
        format,
        count,
        medium: mediumMap[lang] || "english"
      });

      setQuizId(quiz.id);
      setQuizTitle(quiz.title);
      setQuestions(quiz.questions);
      setAnswers(new Array(quiz.questions.length).fill(""));
      // 3 minutes per question
      setTimeLeft(quiz.questions.length * 180);
      setGameState("running");
    } catch (err: any) {
      setError(err.message || "Failed to initialize quiz questions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qIdx: number, val: string) => {
    setAnswers(prev => {
      const next = [...prev];
      next[qIdx] = val;
      return next;
    });
  };

  const handleEssayChange = (qIdx: number, val: string) => {
    setAnswers(prev => {
      const next = [...prev];
      next[qIdx] = val;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!quizId) return;

    setError("");
    setGameState("submitting");

    const mediumMap: Record<Language, string> = {
      en: "english",
      si: "sinhala",
      ta: "tamil"
    };

    try {
      const res = await quizApi.submit({
        quiz_id: quizId,
        answers: answers,
        medium: mediumMap[lang] || "english"
      });

      setSubmission(res);
      setGameState("results");
      
      // Confetti burst for scores >= 75!
      if (res.score >= 75) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to score quiz submission.");
      setGameState("running"); // Re-allow submit
    }
  };

  const handleReset = () => {
    setGameState("setup");
    setQuestions([]);
    setAnswers([]);
    setSubmission(null);
    setQuizId(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
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
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 font-semibold uppercase">
            {lang === "en" ? "Quiz Arena" : lang === "si" ? "ප්‍රශ්නාවලි කලාපය" : "வினாடிவினா அரங்கு"}
          </span>
        </div>
      </header>

      {/* Arena Content Container */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <AnimatePresence mode="wait">
          
          {/* SETUP STATE CARD */}
          {gameState === "setup" && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-panel p-8 rounded-2xl border border-white/5"
            >
              <h2 className="text-2xl font-extrabold text-white mb-6">
                {lang === "en" ? "Quiz Customization" : lang === "si" ? "ප්‍රශ්නාවලි සැකසුම්" : "வினாடிவினா தனிப்பயனாக்கம்"}
              </h2>
              
              <div className="flex flex-col gap-6">
                
                {/* Chapter Select */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {lang === "en" ? "Target Chapter" : lang === "si" ? "ඉලක්කගත පරිච්ඡේදය" : "இலக்கு அத்தியாயம்"}
                  </label>
                  <select 
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {CHAPTER_LIST.map((ch, idx) => (
                      <option key={ch} value={ch} className="bg-[#050508]">
                        {lang === "en" ? ch : lang === "si" ? CHAPTER_LIST_SI[idx] : CHAPTER_LIST_TA[idx]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty Match */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {lang === "en" ? "Difficulty Grade" : lang === "si" ? "අපහසුතා මට්ටම" : "கடினத்தன்மை மட்டம்"}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["easy", "medium", "hard", "exam"].map(diff => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`py-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${difficulty === diff ? "bg-purple-600/20 border-purple-500 text-purple-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                      >
                        {diff === "easy" ? (lang === "en" ? "easy" : lang === "si" ? "පහසු" : "எளிது") :
                         diff === "medium" ? (lang === "en" ? "medium" : lang === "si" ? "මධ්‍යම" : "சாதாரண") :
                         diff === "hard" ? (lang === "en" ? "hard" : lang === "si" ? "අපහසු" : "கடினம்") :
                         (lang === "en" ? "exam" : lang === "si" ? "විභාග මට්ටම" : "தேர்வு")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format Match */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t.format}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["MCQ", "Structured", "Essay"].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={`py-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${format === f ? "bg-cyan-600/20 border-cyan-500 text-cyan-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                      >
                        {f === "MCQ" ? "MCQ" : f === "Structured" ? (lang === "en" ? "Structured" : lang === "si" ? "ව්‍යුහගත" : "கட்டமைப்பு") : (lang === "en" ? "Essay" : lang === "si" ? "රචනා" : "கட்டுரை")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Count */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {lang === "en" ? "Question Count" : lang === "si" ? "ප්‍රශ්න ගණන" : "கேள்விகளின் எண்ணிக்கை"}
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[3, 5, 8, 10].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCount(c)}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${count === c ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                      >
                        {lang === "en" ? `${c} Items` : lang === "si" ? `ප්‍රශ්න ${c}` : `கேள்விகள் ${c}`}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                    {error}
                  </div>
                )}

                {/* Start Button */}
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{lang === "en" ? "Generate & Initialize Practice Exam" : lang === "si" ? "ප්‍රශ්නාවලිය ජනනය කරන්න" : "வினாடிவினாவை உருவாக்கவும்"}</span>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* RUNNING STATE CARD */}
          {gameState === "running" && (
            <motion.div 
              key="running"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Dynamic sticky timer block */}
              <div className="glass-panel p-4 rounded-2xl flex items-center justify-between sticky top-[80px] z-40 border border-purple-500/10">
                <span className="font-bold text-white text-sm truncate">{quizTitle}</span>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  <Timer className="w-4 h-4 animate-pulse" />
                  <span>{lang === "en" ? "Time Left" : lang === "si" ? "ඉතිරි කාලය" : "மீதமுள்ள நேரம்"}: {formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Render Question set */}
              {questions.map((q, qIdx) => (
                <div key={q.id} className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                  <div className="flex gap-3">
                    <span className="text-xs px-2.5 py-1 rounded bg-white/5 border border-white/5 text-gray-400 font-bold">
                      Q{qIdx + 1}
                    </span>
                    <h3 className="font-bold text-white leading-relaxed text-sm sm:text-base">{q.question_text}</h3>
                  </div>

                  {/* Render MCQ Selector options */}
                  {q.question_type === "MCQ" && q.options && (
                    <div className="grid grid-cols-1 gap-2.5 mt-2">
                      {q.options.map((opt: string) => (
                        <div 
                          key={opt}
                          onClick={() => handleSelectOption(qIdx, opt)}
                          className={`p-4 rounded-xl border cursor-pointer text-sm font-semibold transition-all flex items-center gap-3 ${answers[qIdx] === opt ? "bg-blue-600/10 border-blue-500 text-blue-300" : "bg-white/5 border-white/5 text-gray-300 hover:border-white/10"}`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${answers[qIdx] === opt ? "border-blue-500" : "border-white/20"}`}>
                            {answers[qIdx] === opt && <div className="w-2.5 h-2.5 rounded-full bg-blue-50" />}
                          </div>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Render Structured or Essay text input box */}
                  {(q.question_type === "Structured" || q.question_type === "Essay") && (
                    <div className="mt-2">
                      <textarea
                        rows={6}
                        placeholder={lang === "en" ? "Write your calculations, equations, derivations, and final answers..." : lang === "si" ? "ඔබගේ ගණනය කිරීම්, සමීකරණ, ව්‍යුත්පන්නයන් සහ අවසාන පිළිතුරු ලියන්න..." : "உங்கள் கணக்கீடுகள், சமன்பாடுகள், தீர்வுகள் மற்றும் இறுதி பதில்களை எழுதுங்கள்..."}
                        value={answers[qIdx]}
                        onChange={(e) => handleEssayChange(qIdx, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={handleSubmit}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all text-center"
              >
                {lang === "en" ? "Submit Answers for Grading" : lang === "si" ? "පිළිතුරු ලකුණු කිරීම සඳහා යොමු කරන්න" : "மதிப்பீட்டிற்கு பதில்களைச் சமர்ப்பிக்கவும்"}
              </button>
            </motion.div>
          )}

          {/* SUBMITTING STATE LOADER */}
          {gameState === "submitting" && (
            <motion.div 
              key="submitting"
              className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[350px]"
            >
              <Atom className="w-16 h-16 text-purple-500 animate-spin mb-4" />
              <h3 className="font-bold text-white text-base">
                {lang === "en" ? "Grading Arena active" : lang === "si" ? "ලකුණු කිරීමේ කලාපය ක්‍රියාත්මකයි" : "மதிப்பீட்டு அரங்கு செயல்படுகிறது"}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                {lang === "en" ? "The AI Tutor is comparing your derivations against the marking keys, assessing formatting, and structuring study feedback." : 
                 lang === "si" ? "AI ගුරුතුමා ඔබේ විසඳුම් ලකුණු දීමේ ක්‍රමවේද සමඟ සංසන්දනය කරමින්, හැඩතල ගැන්වීම් විශ්ලේෂණය කරමින් අධ්‍යයන ප්‍රතිපෝෂණ සකසයි." : 
                 "AI ஆசிரியர் உங்கள் தீர்வுகளை புள்ளிகள் திட்டத்துடன் ஒப்பிட்டு, வடிவமைப்பை மதிப்பிட்டு, ஆய்வு கருத்துக்களை கட்டமைக்கிறார்."}
              </p>
            </motion.div>
          )}

          {/* RESULTS STATE CARD */}
          {gameState === "results" && submission && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Score header */}
              <div className="glass-panel p-8 rounded-2xl text-center flex flex-col items-center border border-white/5 relative overflow-hidden bg-gradient-to-b from-purple-950/20 to-black/10">
                <span className="text-xs tracking-wider uppercase font-bold text-purple-400">
                  {lang === "en" ? "Practice Submission score" : lang === "si" ? "ප්‍රශ්නාවලි ලකුණු ප්‍රමාණය" : "வினாடிவினா மதிப்பெண்"}
                </span>
                <h1 className="text-5xl font-black text-white mt-3 text-glow-blue">{Math.round(submission.score)}%</h1>
                <p className="text-sm text-gray-400 mt-2 max-w-sm">
                  {submission.score >= 75 ? 
                   (lang === "en" ? "Spectacular! You have mastered these curriculum objectives." : lang === "si" ? "විශිෂ්ටයි! ඔබ මෙම විෂය නිර්දේශයේ අරමුණු හොඳින් ප්‍රගුණ කර ඇත." : "அற்புதம்! இந்த பாடத்திட்ட நோக்கங்களை நீங்கள் தேர்ச்சி பெற்றுள்ளீர்கள்.") : 
                   (lang === "en" ? "Good attempt! Check the review below for marking explanations." : lang === "si" ? "හොඳ උත්සාහයක්! විසඳුම් සහ ලකුණු ලැබී ඇති ආකාරය පහතින් බලා ගන්න." : "நல்ல முயற்சி! விளக்கங்களை அறிய கீழே உள்ள மதிப்பாய்வைச் சரிபார்க்கவும்.")}
                </p>
              </div>

              {/* Study advice */}
              {submission.feedback?.general_study_advice && (
                <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-950/5">
                  <h3 className="font-bold text-white text-sm mb-1.5">
                    {lang === "en" ? "Tutor Study Advice" : lang === "si" ? "ගුරු අධ්‍යයන උපදෙස්" : "ஆசிரியரின் ஆய்வு ஆலோசனை"}
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{submission.feedback.general_study_advice}</p>
                </div>
              )}

              {/* Reviewed Question list */}
              {questions.map((q, idx) => {
                const reviewItem = submission.feedback?.feedback_per_question?.find(
                  (f: any) => f.question_id === q.id || f.question_id === idx + 1
                );
                const isCorrect = reviewItem?.correct;
                const scoreObtained = reviewItem?.marks_obtained ?? 0;

                return (
                  <div key={q.id} className="glass-panel p-6 rounded-2xl flex flex-col gap-4 border border-white/5 relative overflow-hidden">
                    {/* Status icon badge */}
                    <div className="absolute right-6 top-6 shrink-0">
                      {isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : scoreObtained > 0 ? (
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>

                    <div className="flex gap-2">
                      <span className="text-xs px-2.5 py-1 rounded bg-white/5 border border-white/5 text-gray-400 font-bold h-fit">
                        Q{idx + 1}
                      </span>
                      <h3 className="font-bold text-white leading-relaxed text-sm max-w-[80%]">{q.question_text}</h3>
                    </div>

                    {/* Student response */}
                    <div className="p-3.5 rounded-xl bg-white/5 text-xs text-gray-300 leading-relaxed font-sans">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-gray-500 block mb-1">
                        {lang === "en" ? "Your Answer:" : lang === "si" ? "ඔබේ පිළිතුර:" : "உங்கள் பதில்:"}
                      </span>
                      <p>{answers[idx] || (lang === "en" ? "No answer provided." : lang === "si" ? "පිළිතුරක් සපයා නැත." : "பதில் வழங்கப்படவில்லை.")}</p>
                    </div>

                    {/* Review text */}
                    {reviewItem && (
                      <div className="p-4 rounded-xl border border-purple-500/10 bg-purple-950/5 text-xs leading-relaxed font-sans">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-purple-400 block mb-1">
                          {lang === "en" ? "Examiner Review:" : lang === "si" ? "පරීක්ෂක සමාලෝචනය:" : "மதிப்பீட்டாளர் மதிப்பாய்வு:"}
                        </span>
                        <p>{reviewItem.review}</p>
                        {reviewItem.marks_obtained !== undefined && (
                          <span className="inline-block mt-2 font-semibold text-purple-300">
                            {lang === "en" ? "Marks allocated:" : lang === "si" ? "ලබා දී ඇති ලකුණු:" : "ஒதுக்கப்பட்ட புள்ளிகள்:"} {reviewItem.marks_obtained}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={handleReset}
                className="w-full py-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{lang === "en" ? "Return to Quiz customizer" : lang === "si" ? "නැවත සැකසුම් වෙත යන්න" : "வினாடிவினா தனிப்பயனாக்கத்திற்குத் திரும்பு"}</span>
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
