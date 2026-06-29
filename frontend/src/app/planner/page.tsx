"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle, BrainCircuit } from "lucide-react";
import WorkspaceLayout from "@/components/WorkspaceLayout";
import { getUserStats, type UserStats } from "@/lib/gamification";

export default function StudyPlanner() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // G.C.E. A/L Exam Target Date (Nov 23, 2026 08:30:00 AM)
  const EXAM_DATE = "2026-11-23T08:30:00";

  useEffect(() => {
    setStats(getUserStats());

    const updateTimer = () => {
      const difference = +new Date(EXAM_DATE) - +new Date();
      if (difference <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      setCountdown({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const tasks = {
    today: [
      { id: "t1", text: "Revise Coulomb's Law and solve 3 past papers", done: false },
      { id: "t2", text: "Take waves chapter mini-quiz", done: false }
    ],
    tomorrow: [
      { id: "t3", text: "Review common mistakes in electromagnetic induction", done: false },
      { id: "t4", text: "Upload circular motion diagram to OCR solver", done: false }
    ],
    weekly: [
      { id: "t5", text: "Reach Level 4 (Gain 500 more XP points)", done: false },
      { id: "t6", text: "Solve 10 essay questions from thermal physics", done: false }
    ]
  };

  const [activeTasks, setActiveTasks] = useState(tasks);

  const toggleTask = (category: "today" | "tomorrow" | "weekly", id: string) => {
    setActiveTasks(prev => {
      const catTasks = prev[category].map(t => t.id === id ? { ...t, done: !t.done } : t);
      return { ...prev, [category]: catTasks };
    });
  };

  return (
    <WorkspaceLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* Banner header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
            <span>AI study Assistant & Planner</span>
          </h1>
          <p className="text-xs text-gray-400 leading-normal">
            Custom calendar, syllabus revision targets, and real-time exam countdown alerts.
          </p>
        </div>

        {/* Exam Countdown banner */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-gradient-to-r from-red-950/15 via-black/10 to-amber-950/15 border border-amber-500/10 text-center">
          <div className="absolute -right-24 -top-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
          <span className="text-[10px] tracking-widest font-bold uppercase text-amber-400 block mb-3">Countdown to G.C.E. Advanced Level Exam</span>
          
          <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
              <span className="text-3xl font-black text-white block">{countdown.days}</span>
              <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Days</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
              <span className="text-3xl font-black text-white block">{countdown.hours}</span>
              <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Hrs</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
              <span className="text-3xl font-black text-white block">{countdown.minutes}</span>
              <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Mins</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
              <span className="text-3xl font-black text-white block text-amber-400 animate-pulse">{countdown.seconds}</span>
              <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Secs</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Daily lists (2 cols) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* Today's schedule */}
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Today's Revision Checklist</span>
              </h3>
              <div className="flex flex-col gap-3">
                {activeTasks.today.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => toggleTask("today", t.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${t.done ? "bg-emerald-950/10 border-emerald-500/20 text-gray-500 line-through" : "bg-white/5 border-white/5 text-gray-300 hover:border-white/10"}`}
                  >
                    <span className="text-xs">{t.text}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.done ? "bg-emerald-500 border-emerald-500 text-black" : "border-white/20"}`}>
                      {t.done && <span className="text-[8px] font-bold">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tomorrow's Schedule */}
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Tomorrow's Targets</span>
              </h3>
              <div className="flex flex-col gap-3">
                {activeTasks.tomorrow.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => toggleTask("tomorrow", t.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${t.done ? "bg-emerald-950/10 border-emerald-500/20 text-gray-500 line-through" : "bg-white/5 border-white/5 text-gray-300 hover:border-white/10"}`}
                  >
                    <span className="text-xs">{t.text}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.done ? "bg-emerald-500 border-emerald-500 text-black" : "border-white/20"}`}>
                      {t.done && <span className="text-[8px] font-bold">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Side stats / recommendations (1 col) */}
          <div className="flex flex-col gap-6">
            
            {/* Weak Areas Recommendation card */}
            <div className="glass-panel p-5 rounded-2xl border-purple-500/10 bg-purple-950/5">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-purple-400 mb-3">AI Study Recommendations</h3>
              
              <div className="flex flex-col gap-3.5 text-xs leading-relaxed text-gray-300">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">Focus: Electricity & Resistors</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Based on weak performance in ohm's law quiz scores. Tutor recommends reviewing formula library derivations.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex gap-3">
                  <BrainCircuit className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">Unlock Streak multiplier</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Complete today's physics goals to unlock double streak multipliers (+200 XP!).</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly targets */}
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-4">
                <CalendarIcon className="w-4 h-4 text-purple-400" />
                <span>Weekly Objectives</span>
              </h3>
              <div className="flex flex-col gap-3">
                {activeTasks.weekly.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => toggleTask("weekly", t.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${t.done ? "bg-emerald-950/10 border-emerald-500/20 text-gray-500 line-through" : "bg-white/5 border-white/5 text-gray-300 hover:border-white/10"}`}
                  >
                    <span className="text-xs">{t.text}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.done ? "bg-emerald-500 border-emerald-500 text-black" : "border-white/20"}`}>
                      {t.done && <span className="text-[8px] font-bold">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </WorkspaceLayout>
  );
}
