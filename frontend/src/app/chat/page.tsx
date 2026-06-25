"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Atom, Send, Filter, Compass, Calendar, FileText, HelpCircle, CheckCircle, ChevronDown, RefreshCw } from "lucide-react";
import { chatApi } from "@/lib/api";
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

export default function Chat() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("en");
  
  // States
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Filters
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [paperType, setPaperType] = useState("");
  const [year, setYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setError("");
    setLoading(true);
    
    const userMessage = {
      role: "user",
      text: query
    };

    setChatHistory(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery("");

    // Map React app Language state to backend expectations
    const mediumMap: Record<Language, string> = {
      en: "english",
      si: "sinhala",
      ta: "tamil"
    };

    try {
      const payload: any = { 
        query: currentQuery,
        medium: mediumMap[lang] || "english"
      };
      if (chapter) payload.chapter = chapter;
      if (topic) payload.topic = topic;
      if (paperType) payload.paper_type = paperType;
      if (year) payload.year = parseInt(year);

      const res = await chatApi.query(payload);
      
      const assistantMessage = {
        role: "assistant",
        data: res
      };
      
      setChatHistory(prev => [...prev, assistantMessage]);
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

  const clearChat = () => {
    setChatHistory([]);
    setError("");
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
    if (score >= 0.5) return "bg-amber-500/10 border-amber-500/30 text-amber-300";
    return "bg-red-500/10 border-red-500/30 text-red-300";
  };

  const t = translations[lang] || translations.en;

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-6 py-4 glass-panel border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white">
            <Atom className="w-6 h-6 text-blue-400" />
            <span>{t.title} <span className="text-blue-400">{t.tutor}</span></span>
          </Link>
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold">
            {lang === "en" ? "RAG Arena" : lang === "si" ? "RAG කලාපය" : "RAG அரங்கு"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={lang} 
            onChange={(e) => handleLangChange(e.target.value as Language)}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs rounded-full px-3 py-1.5 focus:outline-none transition-all cursor-pointer font-medium"
          >
            <option value="en" className="bg-slate-900 text-white">English</option>
            <option value="si" className="bg-slate-900 text-white">සිංහල</option>
            <option value="ta" className="bg-slate-900 text-white">தமிழ்</option>
          </select>
          <button 
            onClick={clearChat}
            className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Clear Chat History"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Reset" : lang === "si" ? "ප්‍රත්‍යාරම්භ කරන්න" : "மீட்டமை"}</span>
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${showFilters ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Filters" : lang === "si" ? "පෙරහන්" : "வடிகட்டிகள்"}</span>
          </button>
        </div>
      </header>

      {/* Main chat layout */}
      <div className="flex-grow flex relative overflow-hidden">
        
        {/* Filter side panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="glass-panel border-r border-white/5 overflow-y-auto shrink-0 hidden md:block"
            >
              <div className="p-6 flex flex-col gap-6 w-[300px]">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                  {lang === "en" ? "Retrieval Filters" : lang === "si" ? "පෙරහන් ලබාගැනීම" : "மீட்டெடுப்பு வடிகட்டிகள்"}
                </h3>
                
                {/* Chapter selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-400">{t.chapter}</label>
                  <select 
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" className="bg-[#050508]">
                      {lang === "en" ? "All Chapters" : lang === "si" ? "සියලුම පරිච්ඡේද" : "அனைத்து அத்தியாயங்களும்"}
                    </option>
                    {CHAPTER_LIST.map((ch, idx) => (
                      <option key={ch} value={ch} className="bg-[#050508]">
                        {lang === "en" ? ch : lang === "si" ? CHAPTER_LIST_SI[idx] : CHAPTER_LIST_TA[idx]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-400">{t.topic}</label>
                  <input 
                    type="text"
                    placeholder={lang === "en" ? "e.g. Coulomb's Law" : lang === "si" ? "උදා. කුලෝම් නියමය" : "உதா. கூலோமின் விதி"}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>

                {/* Paper type */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-400">{t.format}</label>
                  <select 
                    value={paperType}
                    onChange={(e) => setPaperType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" className="bg-[#050508]">
                      {lang === "en" ? "All Formats" : lang === "si" ? "සියලුම ආකෘති" : "அனைத்து வடிவங்களும்"}
                    </option>
                    <option value="syllabus" className="bg-[#050508]">
                      {lang === "en" ? "Official Syllabus" : lang === "si" ? "නිල විෂය නිර්දේශය" : "அதிகாரப்பூர்வ பாடத்திட்டம்"}
                    </option>
                    <option value="past_paper" className="bg-[#050508]">
                      {lang === "en" ? "Past Papers" : lang === "si" ? "පසුගිය ප්‍රශ්න පත්‍ර" : "கடந்த கால வினாத்தாள்கள்"}
                    </option>
                    <option value="marking_scheme" className="bg-[#050508]">
                      {lang === "en" ? "Marking Schemes" : lang === "si" ? "ලකුණු දීමේ ක්‍රමවේද" : "புள்ளிகள் வழங்கும் திட்டங்கள்"}
                    </option>
                    <option value="notes" className="bg-[#050508]">
                      {lang === "en" ? "Teacher Notes" : lang === "si" ? "ගුරු සටහන්" : "ஆசிரியர் குறிப்புகள்"}
                    </option>
                  </select>
                </div>

                {/* Year */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-400">{t.year}</label>
                  <input 
                    type="number"
                    placeholder="e.g. 2024"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messaging Area */}
        <div className="flex-grow flex flex-col justify-between h-[calc(100vh-73px-88px)] bg-black/10">
          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-6">
            
            {chatHistory.length === 0 && (
              <div className="flex-grow flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                <Atom className="w-16 h-16 text-blue-500/20 animate-pulse mb-6" />
                <h2 className="text-xl font-bold text-white mb-2">
                  {lang === "en" ? "Sri Lankan Physics Knowledge Base" : lang === "si" ? "ශ්‍රී ලංකා භෞතික විද්‍යා දැනුම් පදනම" : "இலங்கை பௌதீகவியல் அறிவுத் தளம்"}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {lang === "en" ? "Enter your Physics question. The AI Tutor extracts answers strictly from references uploaded in your database." : 
                   lang === "si" ? "ඔබේ භෞතික විද්‍යාව ප්‍රශ්නය ඇතුළත් කරන්න. AI ගුරුතුමා ඔබේ දත්ත ගබඩාවේ ඇති විමර්ශන ඇසුරෙන් පමණක් පිළිතුරු සපයයි." : 
                   "உங்கள் பௌதீகவியல் கேள்வியை உள்ளிடவும். AI ஆசிரியர் உங்கள் தரவுத்தளத்தில் பதிவேற்றப்பட்ட குறிப்புகளிலிருந்து மட்டுமே பதில்களைப் பிரித்தெடுக்கிறார்."}
                </p>
                <div className="grid grid-cols-2 gap-3 w-full mt-8">
                  <button 
                    onClick={() => setQuery(lang === "en" ? "What is Coulomb's Law and explain its formula?" : lang === "si" ? "කුලෝම් නියමය යනු කුමක්ද සහ එහි සමීකරණය පැහැදිලි කරන්න." : "கூலோமின் விதி என்ன மற்றும் அதன் சூத்திரத்தை விளக்குக.")}
                    className="p-3 text-xs text-left rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:border-white/15 hover:text-white transition-all"
                  >
                    {lang === "en" ? "What is Coulomb's Law?" : lang === "si" ? "කුලෝම් නියමය යනු කුමක්ද?" : "கூலோமின் விதி என்றால் என்ன?"}
                  </button>
                  <button 
                    onClick={() => setQuery(lang === "en" ? "Derive the equivalent resistance for resistors in parallel." : lang === "si" ? "සමාන්තරගතව ඇති ප්‍රතිරෝධක සඳහා සමක ප්‍රතිරෝධය ව්‍යුත්පන්න කරන්න." : "இணை இணைப்பில் உள்ள மின்தடைகளுக்கான சமவலு மின்தடையை பெறுக.")}
                    className="p-3 text-xs text-left rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:border-white/15 hover:text-white transition-all"
                  >
                    {lang === "en" ? "Resistors in parallel derivation" : lang === "si" ? "ප්‍රතිරෝධක සමාන්තරගත ව්‍යුත්පන්නය" : "மின்தடைகளின் இணை இணைப்பு சமன்பாடு"}
                  </button>
                </div>
              </div>
            )}

            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                
                {/* User Message Bubble */}
                {msg.role === "user" && (
                  <div className="max-w-[80%] p-4 rounded-2xl bg-blue-600 text-white text-sm shadow-md">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                )}

                {/* Assistant RAG Card layout */}
                {msg.role === "assistant" && msg.error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm max-w-xl">
                    {msg.error}
                  </div>
                )}

                {msg.role === "assistant" && msg.data && (
                  <div className="w-full max-w-3xl flex flex-col gap-5">
                    
                    {/* Header Topic Card */}
                    <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-500/15">
                      <div>
                        <span className="text-[10px] tracking-wider uppercase font-bold text-blue-400">
                          {lang === "en" ? "Classified Topic" : lang === "si" ? "වර්ගීකෘත මාතෘකාව" : "வகைப்படுத்தப்பட்ட தலைப்பு"}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-0.5">{msg.data.topic}</h3>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 shrink-0 ${getConfidenceColor(msg.data.confidence_score)}`}>
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>{lang === "en" ? "Confidence" : lang === "si" ? "විශ්වාසනීයත්වය" : "நம்பகத்தன்மை"}: {Math.round(msg.data.confidence_score * 100)}%</span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="glass-panel p-6 rounded-2xl">
                      <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">
                        {lang === "en" ? "Teacher's Explanation" : lang === "si" ? "ගුරු පැහැදිලි කිරීම" : "ஆசிரியரின் விளக்கம்"}
                      </h4>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                        {msg.data.explanation}
                      </p>
                    </div>

                    {/* Formula & Math */}
                    {msg.data.formula && msg.data.formula !== "N/A" && (
                      <div className="glass-panel p-5 rounded-2xl border border-cyan-500/10 bg-cyan-950/5">
                        <h4 className="text-xs uppercase font-bold text-cyan-400 tracking-wider mb-2">
                          {lang === "en" ? "Key Formula" : lang === "si" ? "ප්‍රධාන සමීකරණය" : "முக்கிய சூத்திரம்"}
                        </h4>
                        <pre className="text-base font-mono text-cyan-200 bg-black/30 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                          {msg.data.formula}
                        </pre>
                      </div>
                    )}

                    {/* Worked Example */}
                    {msg.data.worked_example && msg.data.worked_example !== "N/A" && (
                      <div className="glass-panel p-6 rounded-2xl border border-purple-500/10 bg-purple-950/5">
                        <h4 className="text-xs uppercase font-bold text-purple-400 tracking-wider mb-2.5">
                          {lang === "en" ? "Worked Example" : lang === "si" ? "විසඳූ උදාහරණයක්" : "விளக்கப்பட்ட உதாரணம்"}
                        </h4>
                        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                          {msg.data.worked_example}
                        </div>
                      </div>
                    )}

                    {/* Tips and Mistakes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {msg.data.exam_tips && msg.data.exam_tips !== "N/A" && (
                        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/15 bg-emerald-950/5">
                          <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-2">
                            {lang === "en" ? "Exam Tips" : lang === "si" ? "විභාග උපදෙස්" : "தேர்வு குறிப்புகள்"}
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{msg.data.exam_tips}</p>
                        </div>
                      )}
                      {msg.data.common_mistakes && msg.data.common_mistakes !== "N/A" && (
                        <div className="glass-panel p-5 rounded-2xl border border-amber-500/15 bg-amber-950/5">
                          <h4 className="text-xs uppercase font-bold text-amber-400 tracking-wider mb-2">
                            {lang === "en" ? "Common Mistakes" : lang === "si" ? "පොදු වැරදි" : "பொதுவான தவறுகள்"}
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{msg.data.common_mistakes}</p>
                        </div>
                      )}
                    </div>

                    {/* Citations Footer */}
                    {msg.data.citations && msg.data.citations.length > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        <span>{lang === "en" ? "Sources Used:" : lang === "si" ? "භාවිතා කළ මූලාශ්‍ර:" : "பயன்படுத்தப்பட்ட ஆதாரங்கள்:"}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.data.citations.map((c: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-400">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Glowing Loader */}
            {loading && (
              <div className="flex items-center gap-3 self-start p-4 glass-panel rounded-2xl max-w-xs">
                <Atom className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-xs text-gray-400 font-medium">
                  {lang === "en" ? "Retrieving physics references..." : lang === "si" ? "භෞතික විද්‍යා විමර්ශන ලබා ගනිමින් පවතී..." : "பௌதீகவியல் குறிப்புகளை மீட்டெடுக்கிறது..."}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSend} className="p-4 border-t border-white/5 glass-panel flex items-center gap-3">
            <input 
              type="text"
              required
              placeholder={lang === "en" ? "Ask anything about A/L Physics theories, mechanics calculations..." : lang === "si" ? "A/L භෞතික විද්‍යා සිද්ධාන්ත, යාන්ත්‍ර විද්‍යාව ගණනය කිරීම් ඕනෑම දෙයක් අසන්න..." : "A/L பௌதீகவியல் கோட்பாடுகள், இயக்கவியல் கணிப்புகள் பற்றி எதையும் கேளுங்கள்..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
            <button 
              type="submit"
              disabled={loading || !query.trim()}
              className="p-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
