"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Atom, CheckCircle2, AlertTriangle, BookOpen, Calendar, 
  TrendingUp, Award, Clock, ArrowRight, Zap, Target 
} from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { translations, type Language } from "@/lib/translations";
import WorkspaceLayout from "@/components/WorkspaceLayout";
import { getUserStats, type UserStats, completeTopic, rewardXP } from "@/lib/gamification";

interface SyllabusNode {
  id: string;
  name: string;
  nameSi: string;
  nameTa: string;
  desc: string;
  descSi: string;
  descTa: string;
  xpReward: number;
  prereq?: string;
  x: number; // coordinate for SVG graph
  y: number;
}

const SYLLABUS_MAP: SyllabusNode[] = [
  { id: "Measurements", name: "Measurements", nameSi: "මිනුම්", nameTa: "அளவீடுகள்", desc: "Units, dimensions, and error calculations.", descSi: "ඒකක, මාන සහ දෝෂ ගණනය කිරීම්.", descTa: "அலகுகள், பரிமாணங்கள் மற்றும் பிழை கணக்கீடுகள்.", xpReward: 100, x: 80, y: 80 },
  { id: "Mechanics", name: "Mechanics", nameSi: "යාන්ත්‍ර විද්‍යාව", nameTa: "இயக்கவியல்", desc: "Linear motion, forces, projectile dynamics.", descSi: "සරල රේඛීය චලිතය, බල, ප්‍රක්ෂිප්ත චලිතය.", descTa: "நேர்கோட்டு இயக்கம், விசைகள், எறிவிசை இயக்கவியல்.", xpReward: 150, prereq: "Measurements", x: 280, y: 80 },
  { id: "Energy", name: "Work & Energy", nameSi: "කාර්යය සහ ශක්තිය", nameTa: "வேலையும் சக்தியும்", desc: "Work-energy theorem, power efficiency.", descSi: "කාර්යය-ශක්තිය ප්‍රමේයය, කාර්යක්ෂමතාවය.", descTa: "வேலை-சக்தி தேற்றம், சக்தி திறன்.", xpReward: 150, prereq: "Mechanics", x: 480, y: 80 },
  { id: "Waves", name: "Waves & Oscillations", nameSi: "තරංග සහ දෝලන", nameTa: "அலைகளும் அசைவுகளும்", desc: "SHM, Doppler effect, optical diffraction.", descSi: "සරල අනුවර්තී චලිතය, ඩොප්ලර් ආචරණය.", descTa: "எளிய இசை இயக்கம், டாப்ளர் விளைவு.", xpReward: 200, prereq: "Energy", x: 480, y: 220 },
  { id: "Thermal", name: "Thermal Physics", nameSi: "තාප භෞතික විද්‍යාව", nameTa: "வெப்பப் பௌதீகவியல்", desc: "Gas laws, entropy, thermodynamics.", descSi: "වායු නියම, එන්ට්‍රොපිය, තාපගති විද්‍යාව.", descTa: "வாயு விதிகள், எண்ட்ரோபி, வெப்ப இயக்கவியல்.", xpReward: 200, prereq: "Waves", x: 280, y: 220 },
  { id: "Electricity", name: "Electricity", nameSi: "ධාරා විද්‍යුතය", nameTa: "மின்னியல்", desc: "Kirchhoff's laws, circuits, AC currents.", descSi: "කිර්චොෆ් නියම, පරිපථ, ප්‍රත්‍යාවර්ත ධාරා.", descTa: "கிர்ச்சாஃபின் விதிகள், மின்சுற்றுகள், AC மின்னோட்டம்.", xpReward: 250, prereq: "Thermal", x: 80, y: 220 }
];

export default function Dashboard() {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [lang, setLang] = useState<Language>("en");
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const savedLang = localStorage.getItem("lang") as Language;
    if (savedLang) setLang(savedLang);

    setStats(getUserStats());

    const handleLanguage = () => {
      const currentLang = localStorage.getItem("lang") as Language;
      if (currentLang) setLang(currentLang);
    };
    window.addEventListener("languageChange", handleLanguage);

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
      window.removeEventListener("languageChange", handleLanguage);
    };
  }, [router]);

  const toggleTask = (idx: number) => {
    setCompletedTasks(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleNodeClick = (node: SyllabusNode) => {
    if (!stats) return;
    const isCompleted = stats.completedTopics.includes(node.id);
    const isUnlocked = !node.prereq || stats.completedTopics.includes(node.prereq);
    
    if (isUnlocked && !isCompleted) {
      const updated = completeTopic(node.id);
      setStats(updated);
      rewardXP(node.xpReward);
    }
  };

  const t = translations[lang] || translations.en;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="flex flex-col items-center gap-3">
          <Atom className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-gray-400 text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Study goals metrics
  const dailyGoalPercent = stats ? Math.min(Math.round(((stats.xp % 500) / 400) * 100), 100) : 0;

  return (
    <WorkspaceLayout>
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Welcome Briefing Header */}
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden bg-gradient-to-br from-blue-950/20 via-black/10 to-purple-950/20 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute -left-20 -top-20 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
          
          <div className="flex flex-col gap-1.5 max-w-xl">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight flex items-center gap-2">
              <span>{lang === "en" ? "Good Morning, Aakil" : lang === "si" ? "සුභ උදෑසනක්, ආකිල්" : "காலை வணக்கம், ஆகில்"}</span>
              <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-sm text-gray-400 leading-normal">{t.briefing}</p>
          </div>

          <div className="flex gap-4 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/5 text-center">
              <span className="text-2xl font-black text-blue-400 block">{stats?.streak || 0}</span>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Streak Days</span>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/5 text-center">
              <span className="text-2xl font-black text-purple-400 block">{stats?.xp || 0}</span>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total XP</span>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/5 text-center">
              <span className="text-2xl font-black text-cyan-400 block">{report?.questions_asked || 0}</span>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Inquiries</span>
            </div>
          </div>
        </div>

        {/* Dynamic circular statistics & goals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Study Progress Gauges */}
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wide font-bold text-gray-500">{lang === "en" ? "Today's Study Goal" : lang === "si" ? "දෛනික ඉලක්කය" : "தினசரி இலக்கு"}</span>
              <h3 className="text-lg font-bold text-white">{dailyGoalPercent}% Completed</h3>
              <p className="text-[10px] text-gray-500 mt-1">Gain {400 - (stats ? stats.xp % 500 : 0)} more XP to hit daily target</p>
            </div>
            
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" className="stroke-white/5 fill-transparent" strokeWidth="4" />
                <motion.circle 
                  cx="32" cy="32" r="28" 
                  className="stroke-blue-500 fill-transparent" 
                  strokeWidth="4" 
                  strokeDasharray={176} 
                  initial={{ strokeDashoffset: 176 }}
                  animate={{ strokeDashoffset: 176 - (176 * dailyGoalPercent) / 100 }}
                  transition={{ duration: 1.5 }}
                />
              </svg>
              <Zap className="w-5 h-5 text-blue-400 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wide font-bold text-gray-500">{lang === "en" ? "Weekly Goals" : lang === "si" ? "සතිපතා ඉලක්ක" : "வாராந்திர இலக்குகள்"}</span>
              <h3 className="text-lg font-bold text-white">80% Completed</h3>
              <p className="text-[10px] text-gray-500 mt-1">Finish circular motion module</p>
            </div>
            
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" className="stroke-white/5 fill-transparent" strokeWidth="4" />
                <motion.circle 
                  cx="32" cy="32" r="28" 
                  className="stroke-purple-500 fill-transparent" 
                  strokeWidth="4" 
                  strokeDasharray={176} 
                  initial={{ strokeDashoffset: 176 }}
                  animate={{ strokeDashoffset: 176 - (176 * 80) / 100 }}
                  transition={{ duration: 1.5 }}
                />
              </svg>
              <Target className="w-5 h-5 text-purple-400 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wide font-bold text-gray-500">{lang === "en" ? "Syllabus Mastery" : lang === "si" ? "විෂය ප්‍රවීණතාවය" : "பாடத்திட்ட தேர்ச்சி"}</span>
              <h3 className="text-lg font-bold text-white">{stats ? Math.round((stats.completedTopics.length / SYLLABUS_MAP.length) * 100) : 0}% Mastered</h3>
              <p className="text-[10px] text-gray-500 mt-1">{stats?.completedTopics.length} of {SYLLABUS_MAP.length} core units unlocked</p>
            </div>
            
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" className="stroke-white/5 fill-transparent" strokeWidth="4" />
                <motion.circle 
                  cx="32" cy="32" r="28" 
                  className="stroke-cyan-500 fill-transparent" 
                  strokeWidth="4" 
                  strokeDasharray={176} 
                  initial={{ strokeDashoffset: 176 }}
                  animate={{ strokeDashoffset: 176 - (176 * (stats ? (stats.completedTopics.length / SYLLABUS_MAP.length) * 100 : 0)) / 100 }}
                  transition={{ duration: 1.5 }}
                />
              </svg>
              <BookOpen className="w-5 h-5 text-cyan-400 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

        </div>

        {/* Physics Syllabus Knowledge Graph & Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Syllabus Flow Map (2 cols) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col gap-6 relative min-h-[350px]">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Physics Syllabus Knowledge Graph</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Interactive pathway layout. Click unlocked nodes to mark topics complete and claim XP points.</p>
            </div>
            
            {/* SVG Interactive graph area */}
            <div className="w-full overflow-x-auto">
              <svg className="min-w-[550px] h-[300px] bg-black/40 rounded-2xl border border-white/5 p-4 select-none">
                
                {/* SVG Connections (Pathways lines) */}
                {SYLLABUS_MAP.map(node => {
                  if (!node.prereq) return null;
                  const prevNode = SYLLABUS_MAP.find(x => x.id === node.prereq);
                  if (!prevNode) return null;
                  
                  const isPrevCompleted = stats?.completedTopics.includes(prevNode.id);
                  const isNodeCompleted = stats?.completedTopics.includes(node.id);
                  
                  return (
                    <line 
                      key={`${prevNode.id}-${node.id}`}
                      x1={prevNode.x} y1={prevNode.y}
                      x2={node.x} y2={node.y}
                      className={`stroke-2 transition-all ${isNodeCompleted ? "stroke-cyan-500 shadow-lg" : isPrevCompleted ? "stroke-blue-500" : "stroke-white/5"}`}
                      strokeDasharray={isPrevCompleted && !isNodeCompleted ? "5, 5" : "0"}
                    />
                  );
                })}

                {/* Nodes */}
                {SYLLABUS_MAP.map(node => {
                  const isCompleted = stats?.completedTopics.includes(node.id);
                  const isUnlocked = !node.prereq || stats?.completedTopics.includes(node.prereq);
                  
                  return (
                    <g 
                      key={node.id} 
                      className={`cursor-pointer group`} 
                      onClick={() => handleNodeClick(node)}
                    >
                      <circle 
                        cx={node.x} cy={node.y} r="22" 
                        className={`transition-all duration-300 ${isCompleted ? "fill-cyan-500/10 stroke-cyan-500 stroke-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" : isUnlocked ? "fill-blue-500/10 stroke-blue-500 stroke-2 hover:fill-blue-500/25" : "fill-white/5 stroke-white/5 stroke-2"}`} 
                      />
                      <text 
                        x={node.x} y={node.y + 4} 
                        className="text-[12px] font-bold fill-white text-anchor-middle font-sans"
                        textAnchor="middle"
                      >
                        {isCompleted ? "✓" : node.id.slice(0, 2).toUpperCase()}
                      </text>
                      
                      {/* Hover card/tips overlay */}
                      <title>
                        {lang === "en" ? node.name : lang === "si" ? node.nameSi : node.nameTa}
                        {"\n"}{lang === "en" ? node.desc : lang === "si" ? node.descSi : node.descTa}
                        {"\n"}{isCompleted ? "Completed (+XP Claimed)" : isUnlocked ? `Click to Unlock (+${node.xpReward} XP)` : "Locked (Complete pre-requisite chapter first)"}
                      </title>
                      
                      {/* Name label text overlay */}
                      <text 
                        x={node.x} y={node.y + 40} 
                        className={`text-[9.5px] font-bold text-anchor-middle ${isCompleted ? "fill-cyan-300 font-black" : isUnlocked ? "fill-gray-300" : "fill-gray-600"}`}
                        textAnchor="middle"
                      >
                        {lang === "en" ? node.name : lang === "si" ? node.nameSi : node.nameTa}
                      </text>
                    </g>
                  );
                })}

              </svg>
            </div>
          </div>

          {/* Daily practice & checklist (1 col) */}
          <div className="flex flex-col gap-6">
            
            {/* Daily Practice checklist */}
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t.dailyPractice}</span>
              </h3>
              
              <div className="flex flex-col gap-2.5">
                {report?.daily_practice_plan?.map((plan: string, idx: number) => (
                  <div 
                    key={idx}
                    onClick={() => toggleTask(idx)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${completedTasks[idx] ? "bg-emerald-950/10 border-emerald-500/20 text-gray-500 line-through" : "bg-white/5 border-white/5 text-gray-300 hover:border-white/10"}`}
                  >
                    <span className="text-xs leading-normal">{plan}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${completedTasks[idx] ? "bg-emerald-500 border-emerald-500 text-black" : "border-white/20"}`}>
                      {completedTasks[idx] && <span className="text-[9px] font-bold">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak syllabus focus chapters */}
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-purple-400" />
                <span>{t.focusAreas}</span>
              </h3>
              
              {report?.weak_chapters?.length === 0 ? (
                <p className="text-xs text-gray-500 leading-relaxed">No weak areas identified. Keep practicing quizzes to track statistics.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {report?.weak_chapters?.map((wa: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-white truncate max-w-[120px]">{wa.chapter}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{wa.questions_answered} questions</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-black">
                        {wa.average_score}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </WorkspaceLayout>
  );
}
