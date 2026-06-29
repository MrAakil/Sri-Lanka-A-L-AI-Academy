// Client-Side Gamification & State Persistence Helper

export interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  lastActive: string;
  completedTopics: string[]; // List of topic IDs
  badges: string[]; // List of badge IDs
}

const DEFAULT_STATS: UserStats = {
  xp: 120,
  level: 1,
  streak: 3,
  lastActive: new Date().toISOString().split("T")[0],
  completedTopics: ["Measurements"],
  badges: ["welcome"]
};

export const BADGES_LIST: Badge[] = [
  { id: "welcome", title: "First Step", desc: "Signed up to study G.C.E A/L Physics", icon: "🚀" },
  { id: "quantum_inquirer", title: "Quantum Inquirer", desc: "Ask 5 questions to the AI Tutor", icon: "💬" },
  { id: "scanner_pro", title: "OCR Scanner Pro", desc: "Solve 3 diagram or past paper questions", icon: "📷" },
  { id: "mechanics_master", title: "Mechanics Master", desc: "Score 75%+ on a Mechanics Quiz", icon: "⚙️" },
  { id: "atomic_streak", title: "Atomic Streak", desc: "Maintain a 5-day daily study streak", icon: "🔥" }
];

export function getUserStats(): UserStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const data = localStorage.getItem("physics_student_stats");
    if (!data) {
      localStorage.setItem("physics_student_stats", JSON.stringify(DEFAULT_STATS));
      return DEFAULT_STATS;
    }
    const stats: UserStats = JSON.parse(data);
    
    // Check if streak is maintained or broken
    const today = new Date().toISOString().split("T")[0];
    if (stats.lastActive !== today) {
      const lastActiveDate = new Date(stats.lastActive);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let updatedStreak = stats.streak;
      if (diffDays === 1) {
        updatedStreak += 1;
      } else if (diffDays > 1) {
        updatedStreak = 1; // Streak broken, reset to 1
      }
      
      const newStats = { ...stats, streak: updatedStreak, lastActive: today };
      localStorage.setItem("physics_student_stats", JSON.stringify(newStats));
      return newStats;
    }
    
    return stats;
  } catch {
    return DEFAULT_STATS;
  }
}

export function rewardXP(amount: number): UserStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  const stats = getUserStats();
  const newXP = stats.xp + amount;
  
  // Linear Level progression: 500 XP per level
  const newLevel = Math.floor(newXP / 500) + 1;
  const levelUp = newLevel > stats.level;
  
  const updatedStats: UserStats = {
    ...stats,
    xp: newXP,
    level: newLevel
  };
  
  // Custom toast notification for level up
  if (levelUp) {
    window.dispatchEvent(new CustomEvent("physicsLevelUp", { detail: { level: newLevel } }));
  }
  
  localStorage.setItem("physics_student_stats", JSON.stringify(updatedStats));
  window.dispatchEvent(new Event("gamificationUpdated"));
  return updatedStats;
}

export function completeTopic(topicId: string): UserStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  const stats = getUserStats();
  if (stats.completedTopics.includes(topicId)) return stats;
  
  const updatedTopics = [...stats.completedTopics, topicId];
  let updatedXP = stats.xp + 100; // Complete topic reward: 100 XP
  const newLevel = Math.floor(updatedXP / 500) + 1;
  
  const updatedStats = {
    ...stats,
    completedTopics: updatedTopics,
    xp: updatedXP,
    level: newLevel
  };
  
  localStorage.setItem("physics_student_stats", JSON.stringify(updatedStats));
  window.dispatchEvent(new Event("gamificationUpdated"));
  return updatedStats;
}

export function unlockBadge(badgeId: string): UserStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  const stats = getUserStats();
  if (stats.badges.includes(badgeId)) return stats;
  
  const updatedBadges = [...stats.badges, badgeId];
  let updatedXP = stats.xp + 200; // Badge unlock reward: 200 XP
  const newLevel = Math.floor(updatedXP / 500) + 1;
  
  const updatedStats = {
    ...stats,
    badges: updatedBadges,
    xp: updatedXP,
    level: newLevel
  };
  
  localStorage.setItem("physics_student_stats", JSON.stringify(updatedStats));
  window.dispatchEvent(new CustomEvent("physicsBadgeUnlocked", { detail: { badgeId } }));
  window.dispatchEvent(new Event("gamificationUpdated"));
  return updatedStats;
}

// Client Bookmarks State Management
export interface Bookmark {
  id: string;
  type: "chat" | "solution";
  title: string;
  content: any; // Saves API response payload
  savedAt: string;
}

export function getBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem("physics_bookmarks");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addBookmark(type: "chat" | "solution", title: string, content: any): Bookmark[] {
  if (typeof window === "undefined") return [];
  const bookmarks = getBookmarks();
  const newBookmark: Bookmark = {
    id: `${type}_${Date.now()}`,
    type,
    title,
    content,
    savedAt: new Date().toLocaleDateString()
  };
  const updated = [newBookmark, ...bookmarks];
  localStorage.setItem("physics_bookmarks", JSON.stringify(updated));
  window.dispatchEvent(new Event("bookmarksUpdated"));
  return updated;
}

export function removeBookmark(id: string): Bookmark[] {
  if (typeof window === "undefined") return [];
  const bookmarks = getBookmarks();
  const updated = bookmarks.filter(b => b.id !== id);
  localStorage.setItem("physics_bookmarks", JSON.stringify(updated));
  window.dispatchEvent(new Event("bookmarksUpdated"));
  return updated;
}
