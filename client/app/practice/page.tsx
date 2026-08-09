"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const COMPANIES = [
  { id: "General", name: "General Practice", icon: "🎯", desc: "Standard technical interview bar", color: "from-blue-500/20 to-indigo-500/20" },
  { id: "Google", name: "Google", icon: "🔍", desc: "High DSA depth & system scalability", color: "from-red-500/20 to-yellow-500/20" },
  { id: "Amazon", name: "Amazon", icon: "📦", desc: "Leadership Principles & Operational Excellence", color: "from-amber-500/20 to-orange-500/20" },
  { id: "Microsoft", name: "Microsoft", icon: "🪟", desc: "OOP Design Patterns & Robust Engineering", color: "from-blue-600/20 to-cyan-500/20" },
  { id: "TCS", name: "TCS", icon: "💻", desc: "CS Fundamentals & Logical Reasoning", color: "from-purple-500/20 to-indigo-500/20" },
  { id: "Infosys", name: "Infosys", icon: "🏢", desc: "DBMS, SQL Queries & Core Aptitude", color: "from-sky-500/20 to-blue-500/20" },
  { id: "Startup", name: "High-Growth Startup", icon: "🚀", desc: "Full-Stack Execution & Practical Delivery", color: "from-emerald-500/20 to-teal-500/20" },
];

const DOMAINS = [
  "JavaScript/Node.js",
  "React",
  "Python",
  "Data Science",
  "DevOps",
  "System Design",
  "Database Design",
  "General",
];

export default function PracticeSetupPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState("General");
  const [selectedDomain, setSelectedDomain] = useState("JavaScript/Node.js");

  if (isLoading) return null;
  if (!isLoggedIn) {
    router.push("/login");
    return null;
  }

  const handleStart = () => {
    router.push(`/interview?domain=${encodeURIComponent(selectedDomain)}&company=${encodeURIComponent(selectedCompany)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">
            🤖 AI Recruiter Simulator & Practice Setup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a target company recruiter persona and technical domain for your adaptive mock interview.
          </p>
        </div>

        {/* Company Recruiter Simulator Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            🏢 1. Select AI Recruiter Persona
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {COMPANIES.map((company) => {
              const isSelected = selectedCompany === company.id;
              return (
                <Card
                  key={company.id}
                  onClick={() => setSelectedCompany(company.id)}
                  className={`p-5 cursor-pointer transition-all border-2 flex flex-col justify-between ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{company.icon}</span>
                      {isSelected && (
                        <span className="text-xs bg-primary text-white font-bold px-2 py-0.5 rounded-full">
                          Selected ✓
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground text-base">{company.name}</h3>
                    <p className="text-xs text-muted-foreground">{company.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Technical Domain Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            🎯 2. Select Technical Domain
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DOMAINS.map((domain) => {
              const isSelected = selectedDomain === domain;
              return (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`p-4 rounded-xl border text-sm font-semibold transition-all text-left flex items-center justify-between ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  <span>{domain}</span>
                  {isSelected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Launch Button */}
        <div className="pt-4 flex justify-end">
          <Button
            size="lg"
            onClick={handleStart}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold text-base px-8 py-6 rounded-full shadow-lg"
          >
            Launch Adaptive Interview Session →
          </Button>
        </div>
      </main>
    </div>
  );
}
