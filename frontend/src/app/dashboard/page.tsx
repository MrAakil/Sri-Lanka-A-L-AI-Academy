"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Atom, MessageSquare, Image as ImageIcon, Award, BarChart2, CheckCircle2, AlertTriangle, ArrowRight, BookOpen, Calendar, HelpCircle } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { translations, type Language } from "@/lib/translations";

export default function Dashboard() {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
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

    async function loadReport() {
      try {
        const data = await analyticsApi.getStudentReport();
        setReport(data);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }
    loadReport();

    return () => {
      window.removeEventListener("languageChange", handleLanguageChange);
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
    router.refresh();
  };

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  const toggleTask = (idx: number) => {
    setCompletedTasks(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const t = translations[lang] || translations.en;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Atom className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-gray-400 text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  const quickLinks = [
    { icon: <MessageSquare className="w-5 h-5" />, label: t.chatTitle, href: "/chat", desc: t.chatDesc, bg: "bg-blue-600/10 border-blue-500/30 text-blue-400" },
    { icon: <ImageIcon className="w-5 h-5" />, label: t.solverTitle, href: "/solver", desc: t.solverDesc, bg: "bg-cyan-600/10 border-cyan-500/30 text-cyan-400" },
    { icon: <Award className="w-5 h-5" />, label: t.quizTitle, href: "/quiz", desc: t.quizDesc, bg: "bg-purple-600/10 border-purple-500/30 text-purple-400" },
    { icon: <BarChart2 className="w-5 h-5" />, label: t.analyticsTitle, href: "/analytics", desc: t.analyticsDesc, bg: "bg-emerald-600/10 border-emerald-500/30 text-emerald-400" }
  ];

  return (
    <div className="min-h-screen pb-16">
      {/* Dashboard Nav Header */}
      <header className="px-6 py-4 glass-panel border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
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
          <span className="text-xs px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold uppercase">
            {localStorage.getItem("role") || (lang === "en" ? "Student" : lang === "si" ? "සිසුවා" : "மாணவர்")}
          </span>
          <button 
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {t.signOut}
          </button>
        </div>
      </header>

      {/* Content wrapper */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Main Stats & Recommendations */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Welcome Banner */}
          <div className="glass-panel p-8 rounded-2xl relative overflow-hidden bg-gradient-to-br from-blue-950/20 via-black/10 to-purple-950/20 border border-white/5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">{t.welcome}</h1>
            <p className="text-gray-400 text-sm mt-1 max-w-lg">
              {t.briefing}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <p className="text-2xl font-bold text-white">{report?.questions_asked || 0}</p>
                <p className="text-xs text-gray-500 uppercase mt-0.5">{t.queriesAsked}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <p className="text-2xl font-bold text-white">{report?.quizzes_taken || 0}</p>
                <p className="text-xs text-gray-500 uppercase mt-0.5">{t.quizzesFinished}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center col-span-2">
                <p className="text-sm font-semibold text-emerald-400 truncate">
                  {report?.strong_chapters?.length > 0 ? report.strong_chapters[0].chapter : (lang === "en" ? "None yet" : lang === "si" ? "තවම නැත" : "இன்னும் இல்லை")}
                </p>
                <p className="text-xs text-gray-500 uppercase mt-1">{t.topChapter}</p>
              </div>
            </div>
          </div>

          {/* Quick Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map((l) => (
              <Link key={l.label} href={l.href} className="group">
                <div className="p-5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all flex items-start gap-4">
                  <div className={`p-3 rounded-lg border ${l.bg}`}>
                    {l.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{l.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Daily Practice Plan (To Do checklist) */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">{t.dailyPractice}</h2>
            </div>
            <div className="flex flex-col gap-3">
              {report?.daily_practice_plan?.map((plan: string, idx: number) => (
                <div 
                  key={idx}
                  onClick={() => toggleTask(idx)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${completedTasks[idx] ? "bg-emerald-950/10 border-emerald-500/30 text-gray-500 line-through" : "bg-white/5 border-white/5 text-gray-300 hover:border-white/15"}`}
                >
                  <span className="text-sm">{plan}</span>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${completedTasks[idx] ? "bg-emerald-500 border-emerald-500 text-black" : "border-white/20"}`}>
                    {completedTasks[idx] && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Strong/Weak areas & recommendations */}
        <div className="flex flex-col gap-8">
          
          {/* Weak Areas Panel */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">{t.focusAreas}</h2>
            </div>
            
            {report?.weak_chapters?.length === 0 ? (
              <p className="text-xs text-gray-500 leading-relaxed">
                {lang === "en" ? "No weak areas identified. Score below 55% in quizzes to list chapters here." : 
                 lang === "si" ? "දුර්වල පරිච්ඡේද හඳුනාගෙන නොමැත. මෙහි පරිච්ඡේද දැක්වීමට ප්‍රශ්නාවලි වල 55% ට වඩා අඩු ලකුණු ලබා ගන්න." : 
                 "பலவீனமான பகுதிகள் எதுவும் கண்டறியப்படவில்லை. அத்தியாயங்களை இங்கே பட்டியலிட வினாடிவினாக்களில் 55% க்கும் குறைவாகப் பெறுங்கள்."}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {report?.weak_chapters?.map((wa: any, i: number) => (
                  <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white truncate max-w-[150px]">{wa.chapter}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {wa.questions_answered} {lang === "en" ? "questions answered" : lang === "si" ? "ප්‍රශ්න වලට පිළිතුරු සපයා ඇත" : "கேள்விகளுக்கு பதிலளிக்கப்பட்டுள்ளது"}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                      {wa.average_score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teacher Recommendations */}
          <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-950/10">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">{t.tutorRecommendations}</h2>
            </div>
            <ul className="flex flex-col gap-3 text-xs text-gray-300 leading-relaxed list-disc pl-4">
              {report?.study_recommendations?.map((rec: string, i: number) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Weekly Revision Schedule */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">{t.revisionSchedule}</h2>
            </div>
            <div className="flex flex-col gap-3">
              {report?.weekly_revision_schedule?.map((item: any, i: number) => (
                <div key={i} className="flex gap-3 text-xs border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                  <span className="font-bold text-purple-400 uppercase w-16 shrink-0">
                    {lang === "en" ? item.day :
                     lang === "si" ? (item.day === "Monday" ? "සඳුදා" : item.day === "Tuesday" ? "අඟහරුවාදා" : item.day === "Wednesday" ? "බදාදා" : item.day === "Thursday" ? "බ්‍රහස්පතින්දා" : item.day === "Friday" ? "සිකුරාදා" : item.day === "Saturday" ? "සෙනසුරාදා" : "ඉරිදා") :
                     (item.day === "Monday" ? "திங்கள்" : item.day === "Tuesday" ? "செவ்வாய்" : item.day === "Wednesday" ? "புதன்" : item.day === "Thursday" ? "வியாழன்" : item.day === "Friday" ? "வெள்ளி" : item.day === "Saturday" ? "சனி" : "ஞாயிறு")}
                  </span>
                  <div>
                    <h5 className="font-bold text-white leading-normal">{item.chapter}</h5>
                    <p className="text-gray-500 mt-0.5">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
