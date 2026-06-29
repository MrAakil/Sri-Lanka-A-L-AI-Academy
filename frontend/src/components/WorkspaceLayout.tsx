"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Atom, MessageSquare, Image as ImageIcon, Award, BarChart2, BookOpen, 
  Bookmark, Calendar, Settings, Search, Bell, Moon, Sun, Globe, LogOut, CheckCircle 
} from "lucide-react";
import { getUserStats, rewardXP, type UserStats, BADGES_LIST } from "@/lib/gamification";
import { translations, type Language } from "@/lib/translations";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [lang, setLang] = useState<Language>("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Custom toast alerts
  const [levelUpAlert, setLevelUpAlert] = useState<number | null>(null);
  const [badgeAlert, setBadgeAlert] = useState<string | null>(null);

  // Load local state & events
  useEffect(() => {
    setStats(getUserStats());
    
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("lang") as Language;
      if (savedLang) setLang(savedLang);
      
      const savedTheme = localStorage.getItem("theme") as "dark" | "light";
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle("light-mode", savedTheme === "light");
      }
    }

    const handleGamification = () => setStats(getUserStats());
    const handleLanguage = () => {
      const currentLang = localStorage.getItem("lang") as Language;
      if (currentLang) setLang(currentLang);
    };

    const handleLevelUp = (e: Event) => {
      const customEvent = e as CustomEvent;
      setLevelUpAlert(customEvent.detail.level);
      setTimeout(() => setLevelUpAlert(null), 5000);
    };

    const handleBadgeUnlock = (e: Event) => {
      const customEvent = e as CustomEvent;
      const b = BADGES_LIST.find(x => x.id === customEvent.detail.badgeId);
      if (b) {
        setBadgeAlert(`${b.icon} Unlocked: ${b.title}`);
        setTimeout(() => setBadgeAlert(null), 5000);
      }
    };

    window.addEventListener("gamificationUpdated", handleGamification);
    window.addEventListener("languageChange", handleLanguage);
    window.addEventListener("physicsLevelUp", handleLevelUp);
    window.addEventListener("physicsBadgeUnlocked", handleBadgeUnlock);

    return () => {
      window.removeEventListener("gamificationUpdated", handleGamification);
      window.removeEventListener("languageChange", handleLanguage);
      window.removeEventListener("physicsLevelUp", handleLevelUp);
      window.removeEventListener("physicsBadgeUnlocked", handleBadgeUnlock);
    };
  }, []);

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("light-mode", nextTheme === "light");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
    router.refresh();
  };

  const t = translations[lang] || translations.en;

  const menuItems = [
    { name: t.chatTitle, icon: <MessageSquare className="w-4 h-4" />, href: "/chat" },
    { name: t.solverTitle, icon: <ImageIcon className="w-4 h-4" />, href: "/solver" },
    { name: t.quizTitle, icon: <Award className="w-4 h-4" />, href: "/quiz" },
    { name: lang === "en" ? "Formula Library" : lang === "si" ? "සමීකරණ පුස්තකාලය" : "சூத்திர நூலகம்", icon: <BookOpen className="w-4 h-4" />, href: "/formulas" },
    { name: t.myDashboard, icon: <BarChart2 className="w-4 h-4" />, href: "/dashboard" },
    { name: lang === "en" ? "Bookmarks" : lang === "si" ? "සුරැකි සටහන්" : "பக்கக்குறிகள்", icon: <Bookmark className="w-4 h-4" />, href: "/bookmarks" },
    { name: lang === "en" ? "Study Planner" : lang === "si" ? "අධ්‍යයන සැලසුම්කරණය" : "ஆய்வு திட்டமிடுபவர்", icon: <Calendar className="w-4 h-4" />, href: "/planner" }
  ];

  const xpRequiredForNextLevel = 500;
  const currentXPInLevel = stats ? stats.xp % 500 : 0;
  const levelProgressPercent = (currentXPInLevel / xpRequiredForNextLevel) * 100;

  return (
    <div className="min-h-screen flex text-slate-100 bg-[#050508] relative">
      
      {/* Side Navigation panel */}
      <aside className="w-64 border-r border-white/5 bg-black/25 backdrop-blur-xl flex flex-col justify-between p-5 hidden md:flex shrink-0 z-30">
        <div className="flex flex-col gap-8 w-full">
          {/* Logo brand */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white">
            <Atom className="w-7 h-7 text-blue-400 animate-spin" style={{ animationDuration: "16s" }} />
            <span>AL Physics <span className="text-blue-400">Tutor</span></span>
          </Link>

          {/* Gamification mini-banner */}
          {stats && (
            <div className="p-4 rounded-2xl glass-panel relative overflow-hidden bg-gradient-to-br from-blue-950/10 to-purple-950/10 border-blue-500/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400">
                  {lang === "en" ? "Level" : lang === "si" ? "මට්ටම" : "நிலை"} {stats.level}
                </span>
                <span className="text-[10px] text-gray-500 font-bold">🔥 {stats.streak} {lang === "en" ? "Days" : lang === "si" ? "දින" : "நாட்கள்"}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgressPercent}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <div className="flex justify-between items-center mt-1.5 text-[9px] text-gray-400">
                <span>{currentXPInLevel}/500 XP</span>
                <span>{500 - currentXPInLevel} XP to Up</span>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <nav className="flex flex-col gap-1.5">
            {menuItems.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all border ${active ? "bg-blue-600/15 border-blue-500/20 text-white font-bold" : "bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5"}`}>
                    {item.icon}
                    <span>{item.name}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User logout footer */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-red-950/20 hover:border-red-900/30 border border-transparent transition-all flex items-center gap-3"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main content frame */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top Header bar */}
        <header className="h-16 border-b border-white/5 bg-black/10 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
          
          {/* Mobile responsive logo trigger */}
          <div className="flex items-center gap-4 md:hidden">
            <Atom className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-sm text-white">AL Physics</span>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md w-full hidden sm:block">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder={lang === "en" ? "Search theory equations, diagrams, paper references..." : lang === "si" ? "සිද්ධාන්ත, රූප සටහන්, ප්‍රශ්න පත්‍ර සොයන්න..." : "கோட்பாடுகள், வரைபடங்கள், வினாத்தாள்களைத் தேடுக..."}
              className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-500 transition-all"
            />
          </div>

          {/* Interactive controls */}
          <div className="flex items-center gap-3">
            
            {/* Language Selector */}
            <div className="relative flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <select 
                value={lang} 
                onChange={(e) => handleLangChange(e.target.value as Language)}
                className="bg-transparent text-gray-400 text-xs hover:text-white focus:outline-none transition-all cursor-pointer font-medium"
              >
                <option value="en" className="bg-[#0c0c14] text-white">EN</option>
                <option value="si" className="bg-[#0c0c14] text-white">සිං</option>
                <option value="ta" className="bg-[#0c0c14] text-white">தமிழ்</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all hover:bg-white/10"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all hover:bg-white/10 relative"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="w-2 h-2 rounded-full bg-purple-500 absolute -right-0.5 -top-0.5 animate-pulse" />
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2.5 w-72 rounded-2xl glass-panel p-4 border border-white/10 z-50 text-xs shadow-2xl bg-[#0c0c14]"
                  >
                    <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[10px] text-purple-400">
                      {lang === "en" ? "Notifications" : lang === "si" ? "දැනුම්දීම්" : "அறிவிப்புகள்"}
                    </h4>
                    <div className="flex flex-col gap-2.5">
                      <div className="border-b border-white/5 pb-2">
                        <p className="text-gray-300">🎓 Tutor recommendation updated based on mechanics quiz score.</p>
                        <span className="text-[9px] text-gray-500">10m ago</span>
                      </div>
                      <div>
                        <p className="text-gray-300">🔥 Streak maintained! You've unlocked the Daily Practice checklist.</p>
                        <span className="text-[9px] text-gray-500">2h ago</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile */}
            <div className="relative">
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 border border-white/10 flex items-center justify-center font-bold text-xs text-white hover:scale-105 transition-transform"
              >
                A
              </button>
              
              <AnimatePresence>
                {showProfile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2.5 w-48 rounded-2xl glass-panel p-2 border border-white/10 z-50 text-xs shadow-2xl bg-[#0c0c14]"
                  >
                    <div className="p-3 border-b border-white/5">
                      <p className="font-bold text-white">Aakil</p>
                      <p className="text-[10px] text-gray-500">{translations[lang]?.studentView || "Student"}</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left p-2.5 rounded-xl text-red-400 hover:bg-red-950/20 transition-all flex items-center gap-2 mt-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.signOut}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* Content viewport area */}
        <main className="flex-grow overflow-y-auto relative p-6">
          {children}
        </main>
      </div>

      {/* Floating Level Up Alert Toast Overlay */}
      <AnimatePresence>
        {levelUpAlert !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 z-50 glass-panel px-6 py-4 rounded-2xl border-emerald-500/20 bg-emerald-950/20 shadow-2xl flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xl font-bold">
              ⚡
            </div>
            <div>
              <h4 className="font-bold text-emerald-400 text-sm">Level Up!</h4>
              <p className="text-xs text-gray-400 mt-0.5">Congratulations Aakil, you reached Level {levelUpAlert}!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Badge Alert Toast Overlay */}
      <AnimatePresence>
        {badgeAlert !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 z-50 glass-panel px-6 py-4 rounded-2xl border-purple-500/20 bg-purple-950/20 shadow-2xl flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xl font-bold">
              🏆
            </div>
            <div>
              <h4 className="font-bold text-purple-400 text-sm">Achievement Unlocked!</h4>
              <p className="text-xs text-gray-400 mt-0.5">{badgeAlert}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
