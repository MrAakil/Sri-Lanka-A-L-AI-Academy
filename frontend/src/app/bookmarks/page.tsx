"use client";

import { useEffect, useState } from "react";
import { Bookmark as BookmarkIcon, Trash2, Calendar, FileText, CheckCircle, RefreshCw } from "lucide-react";
import WorkspaceLayout from "@/components/WorkspaceLayout";
import { getBookmarks, removeBookmark, type Bookmark } from "@/lib/gamification";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "chat" | "solver">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setBookmarks(getBookmarks());
    
    const handleSync = () => setBookmarks(getBookmarks());
    window.addEventListener("bookmarksUpdated", handleSync);
    return () => window.removeEventListener("bookmarksUpdated", handleSync);
  }, []);

  const handleDelete = (id: string) => {
    const updated = removeBookmark(id);
    setBookmarks(updated);
  };

  const filteredBookmarks = bookmarks.filter(b => {
    if (activeTab === "all") return true;
    return b.type === activeTab;
  });

  return (
    <WorkspaceLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Banner header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BookmarkIcon className="w-6 h-6 text-cyan-400" />
            <span>Saved Bookmarks & Study History</span>
          </h1>
          <p className="text-xs text-gray-400 leading-normal">
            Review and reference formulas, OCR solutions, and theories you've bookmarked during your physics studies.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {(["all", "chat", "solver"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === tab ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/25" : "bg-white/5 border border-white/5 text-gray-400 hover:text-white"}`}
            >
              {tab === "all" ? "All Items" : tab === "chat" ? "AI Tutor Chat" : "OCR Solvers"}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filteredBookmarks.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[300px]">
            <BookmarkIcon className="w-12 h-12 text-gray-500/20 mb-4" />
            <h3 className="font-bold text-white text-base">No Saved Bookmarks</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
              Click the bookmark icon at the bottom of any AI Tutor response or past paper solution card to save it here for offline reference.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredBookmarks.map(b => {
              const isExpanded = expandedId === b.id;
              return (
                <div 
                  key={b.id}
                  className="glass-panel p-5 rounded-2xl border-white/5 hover:border-cyan-500/10 transition-all flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-lg text-xs font-bold ${b.type === "chat" ? "bg-blue-600/10 border border-blue-500/20 text-blue-400" : "bg-cyan-600/10 border border-cyan-500/20 text-cyan-400"}`}>
                        {b.type === "chat" ? "💬 Chat" : "📷 OCR"}
                      </span>
                      <div className="flex flex-col">
                        <h3 
                          onClick={() => setExpandedId(isExpanded ? null : b.id)}
                          className="font-bold text-white text-sm hover:text-cyan-300 transition-colors cursor-pointer leading-snug"
                        >
                          {b.title}
                        </h3>
                        <span className="text-[9.5px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Saved on {b.savedAt}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(b.id)}
                      className="p-2 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 text-red-400 hover:text-red-300 transition-all"
                      title="Delete Bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="pt-4 mt-2 border-t border-white/5 flex flex-col gap-4 text-xs text-slate-300">
                      {b.type === "chat" && b.content && (
                        <div className="flex flex-col gap-4">
                          {/* Explanation */}
                          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-2 text-purple-400">Explanation</h4>
                            <p className="leading-relaxed whitespace-pre-wrap">{b.content.explanation}</p>
                          </div>
                          {/* Formula */}
                          {b.content.formula && b.content.formula !== "N/A" && (
                            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                              <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-2 text-cyan-400">Formula</h4>
                              <pre className="font-mono text-cyan-300 whitespace-pre-wrap">{b.content.formula}</pre>
                            </div>
                          )}
                          {/* Worked Example */}
                          {b.content.worked_example && b.content.worked_example !== "N/A" && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                              <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-2 text-emerald-400">Worked Example</h4>
                              <p className="leading-relaxed whitespace-pre-wrap">{b.content.worked_example}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {b.type === "solution" && b.content && (
                        <div className="flex flex-col gap-4">
                          {/* Chapter and OCR */}
                          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-2 text-blue-400">OCR Extracted Question</h4>
                            <p className="italic leading-relaxed whitespace-pre-wrap">{b.content.extracted_text}</p>
                          </div>
                          {/* Steps */}
                          <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                            <h4 className="font-bold text-white text-[10px] uppercase tracking-wider mb-3 text-cyan-400">Solution Steps</h4>
                            <div className="flex flex-col gap-2.5">
                              {b.content.solution_steps?.map((s: string, i: number) => (
                                <div key={i} className="flex gap-2">
                                  <span className="font-bold text-cyan-400">{i + 1}.</span>
                                  <p className="leading-relaxed">{s}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Final answer */}
                          <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-500/20 text-center">
                            <h4 className="font-bold text-emerald-400 text-[10px] uppercase tracking-wider mb-1">Final Result</h4>
                            <span className="text-sm font-bold text-white font-mono">{b.content.final_answer}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </WorkspaceLayout>
  );
}
