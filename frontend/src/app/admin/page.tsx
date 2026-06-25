"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Atom, Upload, Database, FileText, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { adminApi } from "@/lib/api";

const CHAPTER_LIST = [
  "Measurements", "Mechanics", "Waves", "Thermal Physics", "Electricity", 
  "Magnetism", "Electromagnetic Induction", "Electronics", "Modern Physics", "Nuclear Physics"
];

export default function AdminPortal() {
  const router = useRouter();
  
  // App States
  const [authorized, setAuthorized] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Upload States
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("notes");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("12");
  const [medium, setMedium] = useState("english");
  const [source, setSource] = useState("");
  const [year, setYear] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // Feedback
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    
    if (!token) {
      router.push("/login");
      return;
    }
    
    if (role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setAuthorized(true);
    loadDocuments();
    
    // Poll documents list every 5 seconds to track background ingestion progress
    const interval = setInterval(loadDocuments, 5000);
    return () => clearInterval(interval);
  }, [router]);

  async function loadDocuments() {
    try {
      const docs = await adminApi.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      console.error("Failed to load documents list", err);
    } finally {
      setLoadingDocs(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setUploadSuccess("");
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setError("");
    setUploadSuccess("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_type", fileType);
    if (chapter) formData.append("chapter", chapter);
    if (topic) formData.append("topic", topic);
    if (grade) formData.append("grade", grade);
    if (medium) formData.append("medium", medium);
    if (source) formData.append("source", source);
    if (year) formData.append("year", year);

    try {
      await adminApi.uploadDocument(formData);
      setUploadSuccess("Document uploaded. Indexing process triggered in the background.");
      setFile(null);
      setSource("");
      setTopic("");
      setYear("");
      // Reset file input
      const fileInput = document.getElementById("admin-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      // Refresh documents
      loadDocuments();
    } catch (err: any) {
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document from SQL DB?")) return;
    try {
      await adminApi.deleteDocument(id);
      loadDocuments();
    } catch (err: any) {
      alert("Failed to delete document: " + err.message);
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Atom className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="px-6 py-4 glass-panel border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white">
            <Atom className="w-6 h-6 text-blue-400" />
            <span>AL Physics <span className="text-blue-400">Tutor</span></span>
          </Link>
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 font-semibold uppercase">
            Admin Dashboard
          </span>
        </div>
        <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white transition-all flex items-center gap-1">
          <span>Go to Student View</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Grid Content */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Upload form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Upload className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Ingest Education Materials</h2>
            </div>

            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              {/* Select file */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase">Document File (PDF, DOCX, TXT)</label>
                <input 
                  type="file"
                  id="admin-file"
                  required
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white file:cursor-pointer hover:file:bg-white/15"
                />
              </div>

              {/* Grid selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Document Type</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="notes" className="bg-[#050508]">Teacher Notes</option>
                    <option value="syllabus" className="bg-[#050508]">Official Syllabus</option>
                    <option value="past_paper" className="bg-[#050508]">Past Papers</option>
                    <option value="marking_scheme" className="bg-[#050508]">Marking Scheme</option>
                    <option value="model_paper" className="bg-[#050508]">Model Paper</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Target Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="12" className="bg-[#050508]">Grade 12</option>
                    <option value="13" className="bg-[#050508]">Grade 13</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Curriculum Chapter</label>
                  <select
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" className="bg-[#050508]">Auto Detect</option>
                    {CHAPTER_LIST.map(ch => (
                      <option key={ch} value={ch} className="bg-[#050508]">{ch}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Medium Language</label>
                  <select
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="english" className="bg-[#050508]">English</option>
                    <option value="sinhala" className="bg-[#050508]">Sinhala</option>
                    <option value="tamil" className="bg-[#050508]">Tamil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Topic Match (optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Gravity field"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Year (optional)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 2024"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase">Source description</label>
                <input 
                  type="text"
                  placeholder="e.g. Royal College Term Test"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
              </div>

              {error && (
                <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {error}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Start Indexing Pipeline</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Document lists & status tracker (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 mb-6 justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">Indexed Repositories</h2>
              </div>
              <span className="text-[10px] text-gray-500 italic">Autoupdates (5s)</span>
            </div>

            {loadingDocs ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No syllabus documents uploaded to the knowledge base yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 font-semibold uppercase">
                      <th className="pb-3 pr-2">File Info</th>
                      <th className="pb-3 px-2">Type</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 pl-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        {/* File Name & Chapter */}
                        <td className="py-3.5 pr-2 max-w-[200px]">
                          <div className="font-bold text-white truncate" title={doc.filename}>{doc.filename}</div>
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">
                            {doc.chapter ? `${doc.chapter} | ` : ""}Grade {doc.grade || "12"}
                          </div>
                        </td>
                        {/* Type */}
                        <td className="py-3.5 px-2">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-gray-400 font-semibold uppercase">
                            {doc.file_type}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="py-3.5 px-2">
                          {doc.status === "processed" && (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ready</span>
                            </span>
                          )}
                          {doc.status === "processing" && (
                            <span className="text-blue-400 flex items-center gap-1 font-semibold">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Parsing</span>
                            </span>
                          )}
                          {doc.status === "pending" && (
                            <span className="text-gray-400 flex items-center gap-1 font-semibold">
                              <Loader2 className="w-3.5 h-3.5 animate-pulse" />
                              <span>Queued</span>
                            </span>
                          )}
                          {doc.status === "failed" && (
                            <span className="text-red-400 flex items-center gap-1 font-semibold" title={doc.error_message}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>
                        {/* Action */}
                        <td className="py-3.5 pl-2 text-right">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
