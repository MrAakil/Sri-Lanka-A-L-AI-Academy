"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp, Copy, BookOpen } from "lucide-react";
import WorkspaceLayout from "@/components/WorkspaceLayout";

interface Formula {
  id: string;
  name: string;
  equation: string;
  category: "Mechanics" | "Waves" | "Thermal" | "Electricity" | "Modern";
  variables: { symbol: string; meaning: string; unit: string }[];
  conditions: string;
  mistakes: string;
  example: { problem: string; solution: string };
}

const FORMULAS: Formula[] = [
  {
    id: "v_u_at",
    name: "Velocity-Time Kinematic Equation",
    equation: "v = u + at",
    category: "Mechanics",
    variables: [
      { symbol: "v", meaning: "Final velocity", unit: "m s⁻¹" },
      { symbol: "u", meaning: "Initial velocity", unit: "m s⁻¹" },
      { symbol: "a", meaning: "Constant acceleration", unit: "m s⁻²" },
      { symbol: "t", meaning: "Time duration elapsed", unit: "s" }
    ],
    conditions: "Applicable only when the acceleration (a) is constant along a straight-line vector.",
    mistakes: "Accidentally using this equation for variables when acceleration is changing (e.g., in Simple Harmonic Motion).",
    example: {
      problem: "A stone is thrown vertically upward from ground level with an initial velocity of 20 m/s. Find its velocity after 1.5 seconds.",
      solution: "Using upward as positive: u = 20 m/s, a = -9.81 m/s², t = 1.5 s.\n\nv = u + at\nv = 20 + (-9.81 * 1.5)\nv = 20 - 14.715 = 5.285 m/s upward."
    }
  },
  {
    id: "s_ut_half_at",
    name: "Displacement Kinematic Equation",
    equation: "s = ut + ½at²",
    category: "Mechanics",
    variables: [
      { symbol: "s", meaning: "Displacement vector", unit: "m" },
      { symbol: "u", meaning: "Initial velocity", unit: "m s⁻¹" },
      { symbol: "a", meaning: "Constant acceleration", unit: "m s⁻²" },
      { symbol: "t", meaning: "Time elapsed", unit: "s" }
    ],
    conditions: "Applicable only when the acceleration (a) is constant along a straight-line vector.",
    mistakes: "Forgetting to square the time parameter (t), or confusing speed with displacement.",
    example: {
      problem: "A ball drops from rest from a building roof. Calculate the distance fallen in 3 seconds.",
      solution: "Taking downward as positive: u = 0, a = 9.81 m/s², t = 3 s.\n\ns = ut + 0.5 * a * t²\ns = 0 * 3 + 0.5 * 9.81 * 3²\ns = 0.5 * 9.81 * 9 = 44.145 meters."
    }
  },
  {
    id: "ohms_law",
    name: "Ohm's Law (Potential Difference)",
    equation: "V = IR",
    category: "Electricity",
    variables: [
      { symbol: "V", meaning: "Potential difference across resistor", unit: "V (Volts)" },
      { symbol: "I", meaning: "Current flowing through resistor", unit: "A (Amperes)" },
      { symbol: "R", meaning: "Electrical resistance", unit: "Ω (Ohms)" }
    ],
    conditions: "Applicable only to ohmic conductors when physical parameters (especially temperature) remain constant.",
    mistakes: "Using Ohm's law directly for non-ohmic items like semiconductor diodes, thermistors, or gas discharge bulbs.",
    example: {
      problem: "A heating element connected to a 230V mains supply draws a current of 5A. What is its resistance?",
      solution: "V = 230V, I = 5A.\n\nR = V / I\nR = 230 / 5 = 46 Ohms (Ω)."
    }
  },
  {
    id: "cap_charge",
    name: "Capacitor Charge Storage",
    equation: "Q = CV",
    category: "Electricity",
    variables: [
      { symbol: "Q", meaning: "Electric charge stored on plates", unit: "C (Coulombs)" },
      { symbol: "C", meaning: "Capacitance capacity", unit: "F (Farads)" },
      { symbol: "V", meaning: "Voltage difference across plates", unit: "V (Volts)" }
    ],
    conditions: "Holds for parallel plates, cylindrical, or spherical capacitors within dielectric limits.",
    mistakes: "Assuming capacitance changes when charge is increased. C is constant and depends only on plate geometry.",
    example: {
      problem: "Find the charge on a 4.7 μF capacitor charged to a potential of 12V.",
      solution: "C = 4.7 * 10⁻⁶ F, V = 12V.\n\nQ = C * V\nQ = (4.7 * 10⁻⁶) * 12\nQ = 5.64 * 10⁻⁵ Coulombs."
    }
  },
  {
    id: "heat_capacity",
    name: "Heat Energy Transfer",
    equation: "Q = mcΔθ",
    category: "Thermal",
    variables: [
      { symbol: "Q", meaning: "Heat energy supplied/released", unit: "J (Joules)" },
      { symbol: "m", meaning: "Mass of the substance", unit: "kg" },
      { symbol: "c", meaning: "Specific heat capacity", unit: "J kg⁻¹ K⁻¹" },
      { symbol: "Δθ", meaning: "Change in temperature", unit: "K or °C" }
    ],
    conditions: "Valid only when the substance remains in a single state (no phase changes).",
    mistakes: "Applying this equation during melting or boiling points, where phase changes require latent heat (Q = mL).",
    example: {
      problem: "Calculate heat needed to raise 2 kg of water (c = 4200 J/kg°C) from 25°C to 80°C.",
      solution: "m = 2 kg, c = 4200, Δθ = 80 - 25 = 55°C.\n\nQ = mcΔθ\nQ = 2 * 4200 * 55\nQ = 462,000 Joules = 462 kJ."
    }
  }
];

export default function FormulaLibrary() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = ["All", "Mechanics", "Thermal", "Electricity", "Waves", "Modern"];

  const filteredFormulas = FORMULAS.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                          f.equation.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || f.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <WorkspaceLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Banner Title */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            <span>A/L Physics Formula Library</span>
          </h1>
          <p className="text-xs text-gray-400 leading-normal">
            Quick reference sheet of G.C.E. Advanced Level equations, dimensional units, constraints, and typical pitfalls.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search equations (e.g. F=ma, V=IR)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeCategory === cat ? "bg-blue-600 text-white shadow-md shadow-blue-500/25" : "bg-white/5 border border-white/5 text-gray-400 hover:text-white"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Formula Cards Grid */}
        <div className="flex flex-col gap-4">
          {filteredFormulas.map(f => {
            const isExpanded = expandedId === f.id;
            return (
              <div 
                key={f.id}
                className="glass-panel p-5 rounded-2xl border-white/5 hover:border-blue-500/10 transition-all flex flex-col gap-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-wide font-bold text-blue-400">{f.category}</span>
                    <h3 className="font-bold text-white text-base leading-snug">{f.name}</h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCopy(f.id, f.equation)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all text-xs"
                      title="Copy Equation"
                    >
                      {copiedId === f.id ? (
                        <span className="text-emerald-400 text-[10px]">Copied!</span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button 
                      onClick={() => setExpandedId(isExpanded ? null : f.id)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                  <span className="text-xl font-mono font-bold text-cyan-300 text-glow-cyan">{f.equation}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{f.id}</span>
                </div>

                {isExpanded && (
                  <div className="flex flex-col gap-5 pt-3 border-t border-white/5 text-xs text-gray-300">
                    
                    {/* Variables table */}
                    <div className="flex flex-col gap-2">
                      <h4 className="font-bold text-white text-[10px] uppercase tracking-wider text-purple-400">Variables Definition</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {f.variables.map(v => (
                          <div key={v.symbol} className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                            <span className="font-mono font-bold text-blue-300">{v.symbol}</span>
                            <span className="text-gray-400">{v.meaning}</span>
                            <span className="text-[10px] text-gray-500">{v.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="flex flex-col gap-1.5">
                      <h4 className="font-bold text-white text-[10px] uppercase tracking-wider text-blue-400">Application Constraints</h4>
                      <p className="leading-relaxed text-gray-400">{f.conditions}</p>
                    </div>

                    {/* Common Pitfalls */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-red-500/15 bg-red-950/5">
                      <h4 className="font-bold text-red-400 text-[10px] uppercase tracking-wider">Common Pitfalls & Mistakes</h4>
                      <p className="leading-relaxed text-red-200">{f.mistakes}</p>
                    </div>

                    {/* Sample problem */}
                    <div className="flex flex-col gap-2">
                      <h4 className="font-bold text-white text-[10px] uppercase tracking-wider text-emerald-400">Practice Worked Example</h4>
                      <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-3 font-sans">
                        <div>
                          <span className="font-bold text-[9px] uppercase tracking-wider text-gray-500 block mb-1">Problem Statement:</span>
                          <p className="text-gray-300">{f.example.problem}</p>
                        </div>
                        <div className="pt-3 border-t border-white/5">
                          <span className="font-bold text-[9px] uppercase tracking-wider text-emerald-400 block mb-1">Solution Steps:</span>
                          <p className="text-gray-300 whitespace-pre-wrap">{f.example.solution}</p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </WorkspaceLayout>
  );
}
