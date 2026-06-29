"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Atom, Timer, HelpCircle, CheckCircle2, AlertTriangle, XCircle, BarChart2, RotateCcw, ArrowRight, Award } from "lucide-react";
import { quizApi } from "@/lib/api";
import confetti from "canvas-confetti";
import { translations, type Language } from "@/lib/translations";
import WorkspaceLayout from "@/components/WorkspaceLayout";
import { getUserStats, rewardXP, type UserStats } from "@/lib/gamification";

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
    if (savedLang) setLang(savedLang);

    const handleLanguageChange = () => {
      const currentLang = localStorage.getItem("lang") as Language;
      if (currentLang) setLang(currentLang);
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
      
      // Reward XP based on score
      const scoreXP = Math.round(res.score * 0.5); // Score of 80% = +40 XP
      rewardXP(scoreXP + 10); // Reward extra participation base 10 XP

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
      setGameState("running");
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
    <WorkspaceLayout>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Title bar */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-400" />
            <span>AI Quiz Arena</span>
          </h1>
          <p className="text-xs text-gray-400 leading-normal">
            Challenge your physics knowledge, complete structured exams, and earn XP multiplier points.
          </p>
        </div>

        <AnimatePresence mode="wait">
          
          {/* SETUP STATE CARD */}
          {gameState === "setup" && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-5 mt-4"
            >
              <h2 className="text-base font-bold text-white uppercase tracking-wider text-purple-400">
                Practice Quiz customizer
              </h2>
              
              <div className="flex flex-col gap-5">
                
                {/* Chapter Select */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Syllabus Target Chapter
                  </label>
                  <select 
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Difficulty Grade
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {["easy", "medium", "hard", "exam"].map(diff => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`py-2 rounded-xl border text-[10px] font-bold uppercase transition-all ${difficulty === diff ? "bg-purple-600/10 border-purple-500 text-purple-300" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format Match */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Exam Format</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {["MCQ", "Structured", "Essay"].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={`py-2 rounded-xl border text-[10px] font-bold uppercase transition-all ${format === f ? "bg-cyan-600/10 border-cyan-500 text-cyan-300" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Count */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Question Count
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[3, 5, 8, 10].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCount(c)}
                        className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${count === c ? "bg-blue-600/10 border-blue-500 text-blue-300" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
                      >
                        {c} Qs
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Generate Practice Exam</span>
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
              className="flex flex-col gap-6 mt-4"
            >
              {/* Sticky timer bar */}
              <div className="glass-panel p-4 rounded-2xl flex items-center justify-between sticky top-[80px] z-40 border border-purple-500/10 bg-[#0c0c14]">
                <span className="font-bold text-white text-xs truncate">{quizTitle}</span>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  <Timer className="w-4 h-4 animate-pulse" />
                  <span>Time Left: {formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Question list */}
              {questions.map((q, qIdx) => (
                <div key={q.id} className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                  <div className="flex gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-400 font-bold h-fit">
                      Q{qIdx + 1}
                    </span>
                    <h3 className="font-bold text-white leading-relaxed text-sm">{q.question_text}</h3>
                  </div>

                  {/* Options */}
                  {q.question_type === "MCQ" && q.options && (
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {q.options.map((opt: string) => (
                        <div 
                          key={opt}
                          onClick={() => handleSelectOption(qIdx, opt)}
                          className={`p-3.5 rounded-xl border cursor-pointer text-xs font-semibold transition-all flex items-center gap-3 ${answers[qIdx] === opt ? "bg-blue-600/10 border-blue-500 text-blue-300" : "bg-white/5 border-white/5 text-gray-300 hover:border-white/10"}`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${answers[qIdx] === opt ? "border-blue-500" : "border-white/20"}`}>
                            {answers[qIdx] === opt && <div className="w-2 h-2 rounded-full bg-blue-50" />}
                          </div>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Textarea */}
                  {(q.question_type === "Structured" || q.question_type === "Essay") && (
                    <div className="mt-2">
                      <textarea
                        rows={5}
                        placeholder="Write your calculations, equations, derivations, and final answers here..."
                        value={answers[qIdx]}
                        onChange={(e) => handleEssayChange(qIdx, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={handleSubmit}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-purple-500/25 transition-all text-center"
              >
                Submit Answers for Grading
              </button>
            </motion.div>
          )}

          {/* SUBMITTING STATE LOADER */}
          {gameState === "submitting" && (
            <motion.div 
              key="submitting"
              className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[350px] mt-4"
            >
              <Atom className="w-16 h-16 text-purple-500 animate-spin mb-4" />
              <h3 className="font-bold text-white text-sm">Grading Arena active</h3>
              <p className="text-[10px] text-gray-500 mt-1 max-w-[280px]">
                The AI Tutor is comparing your derivations against the marking keys, assessing formatting, and structuring study feedback.
              </p>
            </motion.div>
          )}

          {/* RESULTS STATE CARD */}
          {gameState === "results" && submission && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6 mt-4"
            >
              <div className="glass-panel p-8 rounded-2xl text-center flex flex-col items-center border border-white/5 relative overflow-hidden bg-gradient-to-b from-purple-950/20 to-black/10">
                <span className="text-[10px] tracking-wider uppercase font-bold text-purple-400">
                  Practice Submission score
                </span>
                <h1 className="text-4xl font-black text-white mt-3 text-glow-blue">{Math.round(submission.score)}%</h1>
                <p className="text-xs text-gray-400 mt-2 max-w-sm">
                  {submission.score >= 75 ? 
                   "Spectacular! You have mastered these curriculum objectives." : 
                   "Good attempt! Check the review below for marking explanations."}
                </p>
              </div>

              {submission.feedback?.general_study_advice && (
                <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 bg-blue-950/5">
                  <h3 className="font-bold text-white text-xs mb-1.5 uppercase tracking-wider text-blue-400">
                    Tutor Study Advice
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{submission.feedback.general_study_advice}</p>
                </div>
              )}

              {questions.map((q, idx) => {
                const reviewItem = submission.feedback?.feedback_per_question?.find(
                  (f: any) => f.question_id === q.id || f.question_id === idx + 1
                );
                const isCorrect = reviewItem?.correct;
                const scoreObtained = reviewItem?.marks_obtained ?? 0;

                return (
                  <div key={q.id} className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-white/5 relative overflow-hidden">
                    <div className="absolute right-6 top-6 shrink-0">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : scoreObtained > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>

                    <div className="flex gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-400 font-bold h-fit">
                        Q{idx + 1}
                      </span>
                      <h3 className="font-bold text-white leading-relaxed text-xs max-w-[80%]">{q.question_text}</h3>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 text-xs text-gray-300 leading-relaxed font-sans">
                      <span className="font-bold uppercase tracking-wider text-[9px] text-gray-500 block mb-1">
                        Your Answer:
                      </span>
                      <p>{answers[idx] || "No answer provided."}</p>
                    </div>

                    {reviewItem && (
                      <div className="p-3.5 rounded-xl border border-purple-500/10 bg-purple-950/5 text-xs leading-relaxed font-sans">
                        <span className="font-bold uppercase tracking-wider text-[9px] text-purple-400 block mb-1">
                          Examiner Review:
                        </span>
                        <p>{reviewItem.review}</p>
                        {reviewItem.marks_obtained !== undefined && (
                          <span className="inline-block mt-2 font-semibold text-purple-300">
                            Marks allocated: {reviewItem.marks_obtained}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={handleReset}
                className="w-full py-3.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return to Quiz customizer</span>
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </WorkspaceLayout>
  );
}
