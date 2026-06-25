"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Atom, MessageSquare, Image, Award, BarChart2, BookOpen, Compass, GraduationCap, ChevronRight } from "lucide-react";
import { translations, type Language } from "@/lib/translations";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token"));
      const savedLang = localStorage.getItem("lang") as Language;
      if (savedLang === "en" || savedLang === "si" || savedLang === "ta") {
        setLang(savedLang);
      }
    }

    // Interactive Particle & Orbit Physics Canvas Animation
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle count
    const particleCount = 65;
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      speedX: number;
      speedY: number;
      charge: number; // positive or negative
      angle: number;
      orbitRadius: number;
      center: { x: number; y: number };
    }> = [];

    const colors = ["#3b82f6", "#a855f7", "#06b6d4"];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        charge: Math.random() > 0.5 ? 1 : -1,
        angle: Math.random() * Math.PI * 2,
        orbitRadius: Math.random() * 200 + 50,
        center: { x: width / 2, y: height / 2 }
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles.forEach(p => {
        p.center.x = width / 2;
        p.center.y = height / 2;
      });
    };

    window.addEventListener("resize", handleResize);

    // Render loop
    const animate = () => {
      ctx.fillStyle = "rgba(5, 5, 8, 0.2)";
      ctx.fillRect(0, 0, width, height);

      // Draw Orbiting Fields in Center (Simulated Atomic Nucleus)
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Draw Bohr-like orbit paths
      ctx.strokeStyle = "rgba(59, 130, 246, 0.05)";
      ctx.lineWidth = 1;
      
      for (let r = 80; r <= 320; r += 80) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Central Glow
      const glow = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 150);
      glow.addColorStop(0, "rgba(59, 130, 246, 0.15)");
      glow.addColorStop(0.5, "rgba(168, 85, 247, 0.05)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
      ctx.fill();

      // Render and update particles
      particles.forEach((p, idx) => {
        // Orbit motion for some particles
        if (idx % 3 === 0) {
          p.angle += 0.005 * p.charge;
          p.x = p.center.x + Math.cos(p.angle) * p.orbitRadius;
          p.y = p.center.y + Math.sin(p.angle) * p.orbitRadius;
        } else {
          // Standard kinetic gas-model motion
          p.x += p.speedX;
          p.y += p.speedY;

          // Boundary checks
          if (p.x < 0 || p.x > width) p.speedX *= -1;
          if (p.y < 0 || p.y > height) p.speedY *= -1;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset

        // Draw connections (simulating force lines/bonds)
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", newLang);
      window.dispatchEvent(new Event("languageChange"));
    }
  };

  const t = translations[lang] || translations.en;

  const features = [
    {
      icon: <MessageSquare className="w-6 h-6 text-blue-400" />,
      title: t.chatTitle,
      desc: t.chatDesc,
      link: "/chat",
      color: "blue"
    },
    {
      icon: <Image className="w-6 h-6 text-cyan-400" />,
      title: t.solverTitle,
      desc: t.solverDesc,
      link: "/solver",
      color: "cyan"
    },
    {
      icon: <Compass className="w-6 h-6 text-purple-400" />,
      title: t.diagramTitle,
      desc: t.diagramDesc,
      link: "/solver",
      color: "purple"
    },
    {
      icon: <Award className="w-6 h-6 text-emerald-400" />,
      title: t.quizTitle,
      desc: t.quizDesc,
      link: "/quiz",
      color: "emerald"
    },
    {
      icon: <BarChart2 className="w-6 h-6 text-amber-400" />,
      title: t.analyticsTitle,
      desc: t.analyticsDesc,
      link: "/analytics",
      color: "amber"
    }
  ];

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Background Physics Interactive Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full px-6 py-4 glass-panel border-b border-white/5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <Atom className="w-8 h-8 text-blue-400 animate-spin" style={{ animationDuration: "12s" }} />
          <span>{t.title} <span className="text-blue-400 text-glow-blue">{t.tutor}</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-300 font-medium">
          <Link href="/chat" className="hover:text-blue-400 transition-colors">{t.chatTitle}</Link>
          <Link href="/solver" className="hover:text-cyan-400 transition-colors">{t.solverTitle}</Link>
          <Link href="/quiz" className="hover:text-purple-400 transition-colors">{t.quizTitle}</Link>
          <Link href="/analytics" className="hover:text-emerald-400 transition-colors">{t.myDashboard}</Link>
          <Link href="/admin" className="hover:text-gray-100 transition-colors">{t.adminPortal}</Link>
        </nav>
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
          {token ? (
            <Link href="/dashboard" className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all">
              {t.myDashboard}
            </Link>
          ) : (
            <Link href="/login" className="px-5 py-2 text-sm font-semibold text-white bg-white/10 rounded-full hover:bg-white/20 border border-white/10 transition-all">
              {t.signIn}
            </Link>
          )}
        </div>
      </header>

      {/* Main Section */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center">
        {/* Animated Headline Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-300 tracking-wide uppercase mb-6"
        >
          {lang === "en" ? "Sri Lankan Advanced Level Syllabus Compliant" : 
           lang === "si" ? "ශ්‍රී ලංකා උසස් පෙළ විෂය නිර්දේශයට අනුකූලයි" : 
           "இலங்கை உயர்தர பாடத்திட்டத்திற்கு இணங்கக்கூடியது"}
        </motion.div>

        {/* Hero title */}
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl"
        >
          {lang === "en" && <>Master A/L Physics with <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 text-glow-blue">AI-Powered RAG</span> Tutoring</>}
          {lang === "si" && <>A/L භෞතික විද්‍යාව <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 text-glow-blue">AI-Powered RAG</span> තාක්ෂණයෙන් ජය ගන්න</>}
          {lang === "ta" && <>A/L பௌதீகவியலை <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 text-glow-blue">AI-Powered RAG</span> மூலம் வெல்லுங்கள்</>}
        </motion.h1>

        {/* Hero description */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-gray-300 max-w-2xl mt-6 text-base md:text-lg leading-relaxed"
        >
          {t.desc}
        </motion.p>

        {/* Hero CTA buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-10 w-full justify-center"
        >
          <Link href="/chat" className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/35 transition-all">
            <span>{t.startTutoring}</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
          <Link href="/solver" className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
            <span>{t.uploadPaper}</span>
          </Link>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-24">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`p-6 rounded-2xl glass-panel relative overflow-hidden group hover:scale-[1.02] cursor-pointer`}
            >
              {/* Card internal neon glow ring */}
              <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40
                ${f.color === "blue" ? "bg-blue-500" : ""}
                ${f.color === "cyan" ? "bg-cyan-500" : ""}
                ${f.color === "purple" ? "bg-purple-500" : ""}
                ${f.color === "emerald" ? "bg-emerald-500" : ""}
                ${f.color === "amber" ? "bg-amber-500" : ""}
              `} />
              
              <div className="flex flex-col gap-4 text-left">
                <div className="p-3 w-fit rounded-xl bg-white/5 border border-white/10">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                <Link href={f.link} className="mt-2 text-xs font-semibold text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>{lang === "en" ? "Open Tool" : lang === "si" ? "විවෘත කරන්න" : "திறக்கவும்"}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-8 text-center text-xs text-gray-500 border-t border-white/5 glass-panel bg-black/20">
        <p>© 2026 Sri Lankan A/L Physics AI Tutor Platform. All rights reserved.</p>
        <p className="mt-1 text-gray-600">Built for Advanced Level Physics (Grade 12 & Grade 13 Curriculum)</p>
      </footer>
    </div>
  );
}

