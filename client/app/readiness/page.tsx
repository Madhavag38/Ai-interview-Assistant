"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ReadinessData {
  readinessScore: number;
  category: "Placement Ready" | "High Potential Candidate" | "Needs Improvement";
  candidateType: "Fresher" | "Internship Seeker" | "Experienced Candidate";
  weakTechnicalAreas: string[];
  communicationGaps: string[];
  missingSkills: string[];
  actionRoadmap: {
    recommendedTechnologies: string[];
    recommendedProjects: string[];
    recommendedCertifications: string[];
    recommendedTopics: string[];
  };
  history?: { date: string; score: number; category: string }[];
}

export default function ReadinessPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [candidateType, setCandidateType] = useState<string>("Fresher");
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchReadiness();
    }
  }, [isLoggedIn]);

  const fetchReadiness = async () => {
    try {
      setIsLoading(true);
      const { data } = await axiosInstance.get("/api/readiness/me");
      if (data?.readiness) {
        setReadiness(data.readiness);
      }
    } catch {
      // Evaluation not created yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setIsLoading(true);
      const { data } = await axiosInstance.post("/api/readiness/evaluate", {
        candidateType,
      });
      if (data?.readiness) {
        setReadiness(data.readiness);
      }
    } catch (err: any) {
      console.error("Evaluation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !isLoggedIn) return null;

  const categoryColors: Record<string, string> = {
    "Placement Ready": "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
    "High Potential Candidate": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    "Needs Improvement": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">
              🎯 AI Placement Readiness Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Combine interview performance & skill data to evaluate your career readiness
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={candidateType}
              onChange={(e) => setCandidateType(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-medium outline-none"
            >
              <option value="Fresher">Track: Fresher</option>
              <option value="Internship Seeker">Track: Internship Seeker</option>
              <option value="Experienced Candidate">Track: Experienced Candidate</option>
            </select>
            <Button
              onClick={handleEvaluate}
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg px-5"
            >
              {isLoading ? "Analyzing..." : "Re-Calculate Score 🔄"}
            </Button>
          </div>
        </div>

        {readiness ? (
          <>
            {/* Score & Category Overview */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 border border-border flex flex-col items-center justify-center text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Readiness Score
                </p>
                <div className="text-6xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {readiness.readinessScore}%
                </div>
                <span className={`mt-4 px-3 py-1 text-xs font-bold rounded-full border ${categoryColors[readiness.category] || categoryColors["Needs Improvement"]}`}>
                  {readiness.category}
                </span>
              </Card>

              <Card className="p-6 border border-border md:col-span-2 space-y-4">
                <h3 className="text-base font-bold text-foreground">
                  🔍 Target Readiness Breakdown ({readiness.candidateType})
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-amber-500 mb-1">
                      ⚠️ Weak Technical Areas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {readiness.weakTechnicalAreas.map((area, i) => (
                        <span key={i} className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/20 font-medium">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-blue-500 mb-1">
                      🗣️ Communication & Delivery Gaps
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {readiness.communicationGaps.map((gap, i) => (
                        <span key={i} className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md border border-blue-500/20 font-medium">
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-purple-500 mb-1">
                      💡 Missing Industry Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {readiness.missingSkills.map((skill, i) => (
                        <span key={i} className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-md border border-purple-500/20 font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Personalized Action Roadmap */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                🗺️ Personalized Growth Roadmap
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border border-border space-y-3">
                  <div className="text-2xl">💻</div>
                  <h4 className="text-sm font-bold text-foreground">Recommended Technologies</h4>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                    {readiness.actionRoadmap?.recommendedTechnologies?.map((tech, i) => (
                      <li key={i} className="font-medium text-foreground">{tech}</li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5 border border-border space-y-3">
                  <div className="text-2xl">🚀</div>
                  <h4 className="text-sm font-bold text-foreground">Suggested Projects</h4>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                    {readiness.actionRoadmap?.recommendedProjects?.map((proj, i) => (
                      <li key={i} className="font-medium text-foreground">{proj}</li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5 border border-border space-y-3">
                  <div className="text-2xl">📜</div>
                  <h4 className="text-sm font-bold text-foreground">Certifications</h4>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                    {readiness.actionRoadmap?.recommendedCertifications?.map((cert, i) => (
                      <li key={i} className="font-medium text-foreground">{cert}</li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5 border border-border space-y-3">
                  <div className="text-2xl">📚</div>
                  <h4 className="text-sm font-bold text-foreground">Interview Topics</h4>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                    {readiness.actionRoadmap?.recommendedTopics?.map((topic, i) => (
                      <li key={i} className="font-medium text-foreground">{topic}</li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <Card className="p-12 border border-border text-center space-y-4">
            <div className="text-5xl">📊</div>
            <h3 className="text-xl font-bold text-foreground">No Readiness Evaluation Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Run your first AI placement readiness evaluation to calculate your score and get a custom improvement roadmap.
            </p>
            <Button
              onClick={handleEvaluate}
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg px-6"
            >
              {isLoading ? "Evaluating..." : "Run AI Placement Evaluation"}
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
