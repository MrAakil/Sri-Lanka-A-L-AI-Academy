"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Atom, Mail, Lock, UserCheck, ShieldAlert } from "lucide-react";
import { authApi } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      let res;
      if (isLogin) {
        res = await authApi.login({ email, password });
      } else {
        res = await authApi.register({ email, password, role });
      }
      
      // Store token and role
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("role", res.role);
      
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      // Send a dummy credential code representing google oauth payload
      const mockCredential = `google_oauth_token_${Math.random().toString(36).substring(2)}`;
      const res = await authApi.googleLogin(mockCredential);
      
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("role", res.role);
      
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12">
      {/* Background radial effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06)_0%,transparent_60%)] pointer-events-none z-0" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10"
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <Link href="/" className="flex items-center gap-1.5 font-bold text-2xl text-white">
            <Atom className="w-8 h-8 text-blue-400 animate-spin" style={{ animationDuration: "15s" }} />
            <span>AL Physics <span className="text-blue-400">Tutor</span></span>
          </Link>
          <p className="text-gray-400 text-sm mt-1">
            {isLogin ? "Sign in to access your educational resources" : "Create an account to start tracking progress"}
          </p>
        </div>

        {/* Error panel */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2"
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="email"
                required
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Admin Role Selector (only in sign up mode) */}
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${role === "student" ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${role === "admin" ? "bg-purple-600/20 border-purple-500 text-purple-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                >
                  Administrator
                </button>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl mt-2 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{isLogin ? "Sign In" : "Create Account"}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative z-10 px-3 bg-[#0a0a12] text-xs text-gray-500 uppercase font-semibold">Or continue with</span>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all text-sm"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Sign In with Google</span>
        </button>

        {/* Toggle link */}
        <p className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-blue-400 hover:underline font-semibold"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
