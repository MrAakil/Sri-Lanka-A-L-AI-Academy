"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Atom, BarChart2, Shield, Users, HelpCircle, Activity, Award, AlertTriangle, CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { analyticsApi } from "@/lib/api";

export default function AnalyticsDashboard() {
  const router = useRouter();
  
  // Auth details
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Data States
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [studentReport, setStudentReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"student" | "admin">("student");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
    
    if (!token) {
      router.push("/login");
      return;
    }
    
    setRole(userRole);
    if (userRole === "admin") {
      setActiveTab("admin"); // Default to admin view for admins
    }
    
    loadData(userRole);
  }, [router]);

  const loadData = async (userRole: string | null) => {
    setLoading(true);
    setError("");
    try {
      if (userRole === "admin") {
        const [adminData, studentData] = await Promise.all([
          analyticsApi.getAdminMetrics(),
          analyticsApi.getStudentReport()
        ]);
        setAdminMetrics(adminData);
        setStudentReport(studentData);
      } else {
        const studentData = await analyticsApi.getStudentReport();
        setStudentReport(studentData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load analytics metrics.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Atom className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-gray-400 text-sm font-semibold">Resolving progress vectors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="px-6 py-4 glass-panel border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white">
            <Atom className="w-6 h-6 text-emerald-400" />
            <span>AL Physics <span className="text-emerald-400">Tutor</span></span>
          </Link>
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-semibold uppercase">
            Analytics
          </span>
        </div>
        <button 
          onClick={() => loadData(role)}
          className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all text-xs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Main Body wrapper */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* Tab switcher for Admins */}
        {role === "admin" && (
          <div className="flex justify-center mb-8">
            <div className="glass-panel p-1 rounded-xl flex gap-1 text-sm font-bold w-fit">
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === "admin" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              >
                <Shield className="w-4 h-4" />
                <span>Global System Metrics</span>
              </button>
              <button
                onClick={() => setActiveTab("student")}
                className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === "student" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>My Performance Map</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ADMIN GLOBAL METRICS TAB */}
        {activeTab === "admin" && adminMetrics && (
          <div className="flex flex-col gap-8">
            
            {/* Top aggregate stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-panel p-5 rounded-2xl">
                <Users className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-2xl font-bold text-white">{adminMetrics.total_students}</p>
                <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Total Active Students</p>
              </div>
              <div className="glass-panel p-5 rounded-2xl">
                <HelpCircle className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-2xl font-bold text-white">{adminMetrics.total_question_volume}</p>
                <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Total Queries Asked</p>
              </div>
              <div className="glass-panel p-5 rounded-2xl">
                <Activity className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-2xl font-bold text-white">{Math.round(adminMetrics.average_retrieval_confidence * 100)}%</p>
                <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Avg RAG Confidence</p>
              </div>
              <div className="glass-panel p-5 rounded-2xl">
                <Users className="w-5 h-5 text-cyan-400 mb-2" />
                <p className="text-2xl font-bold text-white">{adminMetrics.daily_active_history?.length || 0}</p>
                <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Active Study Days</p>
              </div>
            </div>

            {/* Charts & popular categories grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Daily active students SVG representation */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-bold text-white text-sm mb-6 uppercase tracking-wider">Weekly Daily Active History</h3>
                
                {adminMetrics.daily_active_history?.length === 0 ? (
                  <p className="text-xs text-gray-500 py-12 text-center">No active student logins logged this week.</p>
                ) : (
                  <div className="flex items-end justify-between gap-2 h-48 px-4">
                    {adminMetrics.daily_active_history.map((day: any, i: number) => (
                      <div key={i} className="flex flex-col items-center gap-2 flex-grow">
                        <span className="text-[10px] text-emerald-400 font-bold">{day.count}</span>
                        {/* Bar */}
                        <div 
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t shadow-md"
                          style={{ height: `${Math.max(day.count * 15, 8)}px`, maxWidth: "40px" }}
                        />
                        <span className="text-[9px] text-gray-500 transform -rotate-12 mt-1 truncate max-w-[50px]">{day.date.substring(5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weakest chapters and searched topics */}
              <div className="flex flex-col gap-6">
                
                {/* Search rankings */}
                <div className="glass-panel p-6 rounded-2xl">
                  <h3 className="font-bold text-white text-sm mb-4 uppercase tracking-wider">Most Searched Topics</h3>
                  <div className="flex flex-col gap-3">
                    {adminMetrics.most_searched_topics?.map((topic: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <span className="text-gray-300 font-medium truncate max-w-[200px]">{topic.topic}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold">{topic.count} hits</span>
                      </div>
                    ))}
                    {(!adminMetrics.most_searched_topics || adminMetrics.most_searched_topics.length === 0) && (
                      <p className="text-xs text-gray-500 text-center py-6">No queries logged yet.</p>
                    )}
                  </div>
                </div>

                {/* Global Weak Areas */}
                <div className="glass-panel p-6 rounded-2xl">
                  <h3 className="font-bold text-white text-sm mb-4 uppercase tracking-wider">Syllabus Weak Spots (Global)</h3>
                  <div className="flex flex-col gap-3">
                    {adminMetrics.weakest_chapters_globally?.map((ch: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <span className="text-gray-300 font-medium">{ch.chapter}</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">{ch.average_score}% Avg</span>
                      </div>
                    ))}
                    {(!adminMetrics.weakest_chapters_globally || adminMetrics.weakest_chapters_globally.length === 0) && (
                      <p className="text-xs text-gray-500 text-center py-6">No performance statistics loaded yet.</p>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* STUDENT INDIVIDUAL PERFORMANCE TAB */}
        {activeTab === "student" && studentReport && (
          <div className="flex flex-col gap-8">
            
            {/* Top stats bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">AI Assistant Use</span>
                  <h2 className="text-2xl font-bold text-white mt-1">{studentReport.questions_asked}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Queries asked in chat</p>
                </div>
                <HelpCircle className="w-8 h-8 text-blue-500/20" />
              </div>
              <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Exams Taken</span>
                  <h2 className="text-2xl font-bold text-white mt-1">{studentReport.quizzes_taken}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Practice quiz sets submitted</p>
                </div>
                <Award className="w-8 h-8 text-purple-500/20" />
              </div>
              <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Syllabus Weak Modules</span>
                  <h2 className="text-2xl font-bold text-white mt-1">{studentReport.weak_chapters?.length || 0}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Chapters scoring below 55%</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-500/20" />
              </div>
            </div>

            {/* Performance grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Weak Chapters lists */}
              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">My Weakest Chapters</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {studentReport.weak_chapters?.map((wa: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-white">{wa.chapter}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{wa.questions_answered} questions graded</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                        {wa.average_score}%
                      </span>
                    </div>
                  ))}
                  {(!studentReport.weak_chapters || studentReport.weak_chapters.length === 0) && (
                    <p className="text-xs text-gray-500 text-center py-8">None identified. Perform below 55% to log here.</p>
                  )}
                </div>
              </div>

              {/* Strong Chapters list */}
              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">My Strongest Chapters</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {studentReport.strong_chapters?.map((sa: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-white">{sa.chapter}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{sa.questions_answered} questions graded</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                        {sa.average_score}%
                      </span>
                    </div>
                  ))}
                  {(!studentReport.strong_chapters || studentReport.strong_chapters.length === 0) && (
                    <p className="text-xs text-gray-500 text-center py-8">No strong chapters logged yet. Keep practicing!</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
