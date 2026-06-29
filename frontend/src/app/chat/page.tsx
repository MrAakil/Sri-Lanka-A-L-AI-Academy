"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Atom, Send, Filter, Compass, Calendar, FileText, CheckCircle, 
  HelpCircle, ChevronDown, RefreshCw, Volume2, VolumeX, Download, 
  Bookmark, Copy, ArrowRight, Share2, Sparkles, MessageSquare 
} from "lucide-react";
import { chatApi } from "@/lib/api";
import { translations, type Language } from "@/lib/translations";
import WorkspaceLayout from "@/components/WorkspaceLayout";
import { getUserStats, rewardXP, addBookmark, getBookmarks, removeBookmark, type UserStats } from "@/lib/gamification";

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

// Simulated typewriter component for streaming effect
function StreamingText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    const words = text.split(" ");
    
    const interval = setInterval(() => {
      if (index < words.length) {
        setDisplayedText(prev => prev + (prev ? " " : "") + words[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 45); // Adjust typing speed
    
    return () => clearInterval(interval);
  }, [text]);

  return <p className="text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">{displayedText}</p>;
}

export default function Chat() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [lang, setLang] = useState<Language>("en");
  const [stats, setStats] = useState<UserStats | null>(null);
  
  // States
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [error, setError] = useState("");
  
  // Filters
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [paperType, setPaperType] = useState("");
  const [year, setYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Speech & Bookmarks State
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync state
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    setStats(getUserStats());
    
    const savedBookmarks = getBookmarks();
    setSavedIds(savedBookmarks.map(b => b.title)); // Use title as key

    const savedLang = localStorage.getItem("lang") as Language;
    if (savedLang) setLang(savedLang);

    const handleLanguage = () => {
      const currentLang = localStorage.getItem("lang") as Language;
      if (currentLang) setLang(currentLang);
    };
    
    window.addEventListener("languageChange", handleLanguage);
    return () => window.removeEventListener("languageChange", handleLanguage);
  }, [router]);

  // Thinking steps timer
  useEffect(() => {
    if (!loading) {
      setThinkingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  const handleSend = async (e: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = customQuery || query;
    if (!finalQuery.trim() || loading) return;

    setError("");
    setLoading(true);
    
    const userMessage = {
      role: "user",
      text: finalQuery
    };

    setChatHistory(prev => [...prev, userMessage]);
    setQuery("");

    const mediumMap: Record<Language, string> = {
      en: "english",
      si: "sinhala",
      ta: "tamil"
    };

    try {
      const payload: any = { 
        query: finalQuery,
        medium: mediumMap[lang] || "english"
      };
      if (chapter) payload.chapter = chapter;
      if (topic) payload.topic = topic;
      if (paperType) payload.paper_type = paperType;
      if (year) payload.year = parseInt(year);

      const res = await chatApi.query(payload);
      
      const assistantMessage = {
        role: "assistant",
        id: `msg_${Date.now()}`,
        data: res
      };
      
      setChatHistory(prev => [...prev, assistantMessage]);
      rewardXP(15); // Reward 15 XP for asking a physics inquiry!
    } catch (err: any) {
      setError(err.message || "Failed to generate RAG response.");
      setChatHistory(prev => [
        ...prev, 
        { 
          role: "assistant", 
          error: err.message || "Failed to generate RAG response." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Speak text-to-speech
  const handleSpeak = (id: string, text: string) => {
    if (typeof window === "undefined") return;
    
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    
    // Choose local language voice settings
    if (lang === "si") speech.lang = "si-LK";
    else if (lang === "ta") speech.lang = "ta-IN";
    else speech.lang = "en-US";
    
    speech.onend = () => setSpeakingId(null);
    speech.onerror = () => setSpeakingId(null);
    
    setSpeakingId(id);
    window.speechSynthesis.speak(speech);
  };

  // Download response as text PDF mockup
  const handleDownload = (data: any) => {
    const textContent = `
=== A/L PHYSICS AI TUTOR RESPONSE ===
Topic: ${data.topic}
Confidence: ${Math.round(data.confidence_score * 100)}%
Explanation: ${data.explanation}
Formula: ${data.formula}
Worked Example: ${data.worked_example}
Exam Tips: ${data.exam_tips}
Common Mistakes: ${data.common_mistakes}
Citations: ${data.citations?.join(", ") || "None"}
`;
    const element = document.createElement("a");
    const file = new Blob([textContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${data.topic.replace(/\s+/g, "_")}_solution.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Bookmark response
  const handleBookmark = (title: string, data: any) => {
    if (savedIds.includes(title)) {
      // Find ID and delete it
      const saved = getBookmarks();
      const match = saved.find(x => x.title === title);
      if (match) {
        removeBookmark(match.id);
        setSavedIds(prev => prev.filter(x => x !== title));
      }
    } else {
      addBookmark("chat", title, data);
      setSavedIds(prev => [...prev, title]);
      rewardXP(10); // Reward 10 XP for bookmarking!
    }
  };

  // Copy response values
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
    if (score >= 0.5) return "bg-amber-500/10 border-amber-500/30 text-amber-300";
    return "bg-red-500/10 border-red-500/30 text-red-300";
  };

  const t = translations[lang] || translations.en;

  const thinkingLabels = [
    "Searching Physics Syllabus & Notes...",
    "Scanning Past Papers & Questions...",
    "Checking Official Marking Schemes...",
    "Structuring Premium Explanation cards..."
  ];

  const popularQuestions = [
    { text: "How does Lenz's Law relate to Conservation of Energy?", si: "ලෙන්ස් නියමය ශක්ති සංරක්ෂණ නියමයට සම්බන්ධ වන්නේ කෙසේද?", ta: "லென்ஸின் விதி எவ்வாறு சக்தி காப்பு விதியுடன் தொடர்புடையது?" },
    { text: "Explain the Doppler Effect for a moving observer.", si: "චලනය වන නිරීක්ෂකයෙකු සඳහා ඩොප්ලර් ආචරණය පැහැදිලි කරන්න.", ta: "நகரும் அவதானிப்பவருக்கு டாப்ளர் விளைவை விளக்குக." },
    { text: "Derive equivalent capacitance for capacitors in series.", si: "ශ්‍රේණිගත ධාරිත්‍රක සඳහා සමක ධාරිතාවය ව්‍යුත්පන්න කරන්න.", ta: "தொடர் இணைப்பில் உள்ள மின்தேக்கிகளின் சமவலு மின்தேக்கத்திறனை பெறுக." }
  ];

  return (
    <WorkspaceLayout>
      <div className="flex h-[calc(100vh-120px)] gap-6 relative overflow-hidden">
        
        {/* Filter side panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="glass-panel border-r border-white/5 overflow-y-auto shrink-0 hidden lg:block bg-[#0c0c14] rounded-2xl"
            >
              <div className="p-5 flex flex-col gap-5 w-[280px]">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-blue-400">
                  Retrieval Parameters
                </h3>
                
                {/* Chapter selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.chapter}</label>
                  <select 
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" className="bg-[#050508]">All Chapters</option>
                    {CHAPTER_LIST.map((ch, idx) => (
                      <option key={ch} value={ch} className="bg-[#050508]">
                        {lang === "en" ? ch : lang === "si" ? CHAPTER_LIST_SI[idx] : CHAPTER_LIST_TA[idx]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.topic}</label>
                  <input 
                    type="text"
                    placeholder="e.g. Coulomb's Law"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>

                {/* Format selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.format}</label>
                  <select 
                    value={paperType}
                    onChange={(e) => setPaperType(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" className="bg-[#050508]">All Sources</option>
                    <option value="syllabus" className="bg-[#050508]">Syllabus Guide</option>
                    <option value="past_paper" className="bg-[#050508]">Past Examination papers</option>
                    <option value="marking_scheme" className="bg-[#050508]">Official Schemes</option>
                    <option value="notes" className="bg-[#050508]">Academic Notes</option>
                  </select>
                </div>

                {/* Year */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.year}</label>
                  <input 
                    type="number"
                    placeholder="e.g. 2024"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Core Chat Console Workspace */}
        <div className="flex-grow flex flex-col justify-between rounded-2xl border border-white/5 bg-[#08080f]/40 relative overflow-hidden">
          
          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-6">
            
            {/* 1. AI Welcome Screen Experience (if chatHistory is empty) */}
            {chatHistory.length === 0 && (
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 py-4">
                
                {/* Greeting Card */}
                <div className="text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                    {lang === "en" ? "Good Morning, Aakil" : lang === "si" ? "සුභ උදෑසනක්, ආකිල්" : "காலை வணக்கம், ஆகில்"} 👋
                  </h2>
                  <p className="text-xs text-gray-400 max-w-sm">
                    {lang === "en" ? "Ready to master A/L Physics today?" : lang === "si" ? "අද A/L භෞතික විද්‍යාව ජය ගැනීමට සූදානම්ද?" : "இன்று A/L பௌதீகவியலை வெல்ல தயாராக இருக்கிறீர்களா?"}
                  </p>
                </div>

                {/* Study Streak & Goal brief panel */}
                {stats && (
                  <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/5 border border-white/5 text-center text-[10px]">
                    <div>
                      <span className="text-gray-500 block uppercase font-bold tracking-wider">Streak</span>
                      <span className="text-sm font-black text-white mt-0.5 block">🔥 {stats.streak} Days</span>
                    </div>
                    <div className="border-x border-white/5">
                      <span className="text-gray-500 block uppercase font-bold tracking-wider">Completed</span>
                      <span className="text-sm font-black text-white mt-0.5 block">📘 {stats.completedTopics.length} Chapters</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block uppercase font-bold tracking-wider">Status Level</span>
                      <span className="text-sm font-black text-white mt-0.5 block">⚡ Lvl {stats.level}</span>
                    </div>
                  </div>
                )}

                {/* Quick actions dashboard cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div 
                    onClick={() => setQuery("Continue Previous Session")}
                    className="p-4 rounded-2xl glass-panel bg-gradient-to-br from-blue-950/10 to-transparent border-white/5 hover:border-blue-500/20 cursor-pointer flex justify-between items-center group"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-white">Continue Session</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Resume your last kinematics study deck</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div 
                    onClick={() => router.push("/solver")}
                    className="p-4 rounded-2xl glass-panel bg-gradient-to-br from-purple-950/10 to-transparent border-white/5 hover:border-purple-500/20 cursor-pointer flex justify-between items-center group"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-white">Solve Past Papers</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Upload a question diagram to scan</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div 
                    onClick={() => router.push("/quiz")}
                    className="p-4 rounded-2xl glass-panel bg-gradient-to-br from-cyan-950/10 to-transparent border-white/5 hover:border-cyan-500/20 cursor-pointer flex justify-between items-center group"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-white">Generate Quiz</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Test theory with custom questions</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div 
                    onClick={() => router.push("/dashboard")}
                    className="p-4 rounded-2xl glass-panel bg-gradient-to-br from-emerald-950/10 to-transparent border-white/5 hover:border-emerald-500/20 cursor-pointer flex justify-between items-center group"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-white">View Progress</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Check circular mastery syllabus rings</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {/* Popular syllabus questions list */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Popular Inquiries</span>
                  <div className="flex flex-col gap-2">
                    {popularQuestions.map((q, idx) => {
                      const qText = lang === "en" ? q.text : lang === "si" ? q.si : q.ta;
                      return (
                        <button 
                          key={idx}
                          onClick={(e) => handleSend(e, qText)}
                          className="w-full p-3 text-xs text-left rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:border-white/10 hover:text-white transition-all flex items-center gap-2"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate">{qText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* 2. Structured Chat History rendering */}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                
                {/* User query bubble */}
                {msg.role === "user" && (
                  <div className="max-w-[75%] p-4 rounded-2xl bg-blue-600 text-white text-xs font-semibold shadow-md">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                )}

                {/* Assistant multi-card layout */}
                {msg.role === "assistant" && msg.error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs max-w-xl">
                    {msg.error}
                  </div>
                )}

                {msg.role === "assistant" && msg.data && (
                  <div className="w-full max-w-3xl flex flex-col gap-4">
                    
                    {/* Header Topic Card */}
                    <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-500/15">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <span className="text-[9px] tracking-wider uppercase font-bold text-blue-400">Classified Concept Topic</span>
                          <h3 className="text-sm font-bold text-white leading-snug">{msg.data.topic}</h3>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 shrink-0 ${getConfidenceColor(msg.data.confidence_score)}`}>
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Syllabus Match: {Math.round(msg.data.confidence_score * 100)}%</span>
                      </div>
                    </div>

                    {/* Explanation card with typing simulator */}
                    <div className="glass-panel p-5 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">📖</span>
                        <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Teacher's Explanation</h4>
                      </div>
                      {/* Simulated typing animation for latest message, static for past */}
                      {i === chatHistory.length - 1 ? (
                        <StreamingText text={msg.data.explanation} />
                      ) : (
                        <p className="text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">{msg.data.explanation}</p>
                      )}
                    </div>

                    {/* Formula card */}
                    {msg.data.formula && msg.data.formula !== "N/A" && (
                      <div className="glass-panel p-5 rounded-2xl border border-cyan-500/10 bg-cyan-950/5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">🧮</span>
                          <h4 className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Key Formula</h4>
                        </div>
                        <pre className="text-sm font-mono text-cyan-200 bg-black/40 p-3.5 rounded-xl overflow-x-auto whitespace-pre-wrap">
                          {msg.data.formula}
                        </pre>
                      </div>
                    )}

                    {/* Worked Example card */}
                    {msg.data.worked_example && msg.data.worked_example !== "N/A" && (
                      <div className="glass-panel p-5 rounded-2xl border border-purple-500/10 bg-purple-950/5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">📝</span>
                          <h4 className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Practice Example Solution</h4>
                        </div>
                        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                          {msg.data.worked_example}
                        </div>
                      </div>
                    )}

                    {/* Common Pitfalls and Exam Tips */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {msg.data.exam_tips && msg.data.exam_tips !== "N/A" && (
                        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/15 bg-emerald-950/5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">🎯</span>
                            <h4 className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Exam Tips</h4>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{msg.data.exam_tips}</p>
                        </div>
                      )}
                      {msg.data.common_mistakes && msg.data.common_mistakes !== "N/A" && (
                        <div className="glass-panel p-5 rounded-2xl border border-red-500/15 bg-red-950/5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">⚠</span>
                            <h4 className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Common Student Mistakes</h4>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{msg.data.common_mistakes}</p>
                        </div>
                      )}
                    </div>

                    {/* Citations references */}
                    {msg.data.citations && msg.data.citations.length > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        <span>Syllabus Guides:</span>
                        <div className="flex flex-wrap gap-1">
                          {msg.data.citations.map((c: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-400">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Card Actions Footer controls */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 text-xs">
                      
                      <div className="flex items-center gap-3">
                        {/* Audio voice toggle */}
                        <button 
                          onClick={() => handleSpeak(msg.id, msg.data.explanation)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                          {speakingId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-red-400 text-[10px]">Stop Audio</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Speak answer</span>
                            </>
                          )}
                        </button>
                        
                        {/* PDF Text Downloader */}
                        <button 
                          onClick={() => handleDownload(msg.data)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-[10px]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF Export</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Bookmark database button */}
                        <button 
                          onClick={() => handleBookmark(msg.data.topic, msg.data)}
                          className={`p-1.5 rounded-lg border transition-all ${savedIds.includes(msg.data.topic) ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
                          title="Save Bookmark"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy button */}
                        <button 
                          onClick={() => handleCopy(msg.id, msg.data.explanation)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all"
                          title="Copy Explanation"
                        >
                          {copiedId === msg.id ? (
                            <span className="text-emerald-400 text-[10px]">Copied</span>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                    </div>

                    {/* 4. Suggested Follow-up Questions */}
                    {i === chatHistory.length - 1 && (
                      <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Suggested Follow-ups</span>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={(e) => handleSend(e, `Show me a G.C.E. A/L past paper question on ${msg.data.topic}.`)}
                            className="px-3 py-1.5 rounded-lg bg-blue-950/15 border border-blue-500/10 text-gray-400 hover:text-blue-300 text-[10px] transition-all hover:bg-blue-950/30"
                          >
                            Show me an A/L question
                          </button>
                          <button 
                            onClick={(e) => handleSend(e, `Provide a difficult mathematical calculation of ${msg.data.topic}.`)}
                            className="px-3 py-1.5 rounded-lg bg-blue-950/15 border border-blue-500/10 text-gray-400 hover:text-blue-300 text-[10px] transition-all hover:bg-blue-950/30"
                          >
                            Give me a difficult numerical
                          </button>
                          <button 
                            onClick={(e) => handleSend(e, `Create a revision quiz on the chapter of ${msg.data.topic}.`)}
                            className="px-3 py-1.5 rounded-lg bg-blue-950/15 border border-blue-500/10 text-gray-400 hover:text-blue-300 text-[10px] transition-all hover:bg-blue-950/30"
                          >
                            Create a quiz on this
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            ))}

            {/* 3. Intelligent Thinking Steps Loader overlay */}
            {loading && (
              <div className="flex items-center gap-3.5 self-start p-4 glass-panel rounded-2xl max-w-sm border-blue-500/20 bg-blue-950/5">
                <Atom className="w-5 h-5 text-blue-400 animate-spin" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-blue-400 uppercase tracking-widest font-black animate-pulse">RAG Engine Running</span>
                  <span className="text-xs text-gray-300 font-medium">
                    {thinkingLabels[thinkingStep]}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Form input console */}
          <form onSubmit={(e) => handleSend(e)} className="p-4 border-t border-white/5 glass-panel flex items-center gap-3 bg-black/25">
            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl border transition-all ${showFilters ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
              title="Toggle Retrieval Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <input 
              type="text"
              required
              placeholder="Ask anything about A/L Physics syllabus models, formulas, and papers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-500 transition-all"
            />
            <button 
              type="submit"
              disabled={loading || !query.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>
    </WorkspaceLayout>
  );
}
