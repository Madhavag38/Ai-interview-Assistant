"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Challenge {
  _id: string;
  title: string;
  category: "Technical" | "HR" | "Aptitude" | "Domain-Specific";
  difficulty: "Easy" | "Medium" | "Hard";
  question: string;
  xpReward: number;
}

interface LeaderboardEntry {
  rank: number;
  userName: string;
  totalScore: number;
  challengesCompleted: number;
  badge: string;
}

export default function ArenaPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchArenaData();
    }
  }, [isLoggedIn]);

  const fetchArenaData = async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        axiosInstance.get("/api/arena/challenges"),
        axiosInstance.get("/api/arena/leaderboard"),
      ]);
      if (cRes.data?.challenges) setChallenges(cRes.data.challenges);
      if (lRes.data?.leaderboard) setLeaderboard(lRes.data.leaderboard);
    } catch (err) {
      console.error("Arena fetch error:", err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedChallenge || !answer.trim()) return;
    setIsSubmitting(true);
    try {
      const { data } = await axiosInstance.post("/api/arena/submit", {
        challengeId: selectedChallenge._id,
        answer,
      });
      setScore(data.score);
      setFeedback(data.feedback);
      fetchArenaData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to submit challenge");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">
            ⚔️ Peer Challenge Arena & Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compete in daily interview challenges, earn XP, and climb the global ranks!
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Active Challenges List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🔥 Active Daily Challenges
            </h2>

            {selectedChallenge ? (
              <Card className="p-6 border border-primary/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {selectedChallenge.category} • {selectedChallenge.difficulty}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedChallenge(null);
                      setFeedback(null);
                      setScore(null);
                      setAnswer("");
                    }}
                    className="text-xs"
                  >
                    ← Back to Challenges
                  </Button>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedChallenge.title}</h3>
                  <p className="text-sm font-medium text-foreground/90 mt-2 bg-muted/30 p-4 rounded-xl border border-border">
                    "{selectedChallenge.question}"
                  </p>
                </div>

                {score !== null ? (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-2">
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">
                      🎉 Challenge Completed! Score: {score}/100
                    </p>
                    <p className="text-xs text-muted-foreground">{feedback}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={4}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full p-3 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !answer.trim()}
                      className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl"
                    >
                      {isSubmitting ? "Evaluating..." : "Submit Answer & Earn XP"}
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {challenges.map((challenge) => (
                  <Card
                    key={challenge._id}
                    className="p-5 border border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between"
                    onClick={() => setSelectedChallenge(challenge)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {challenge.category}
                        </span>
                        <span className="text-xs font-bold text-amber-500">
                          +{challenge.xpReward} XP
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-base">{challenge.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        "{challenge.question}"
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="mt-4 w-full bg-primary/10 text-primary hover:bg-primary/20 font-semibold rounded-lg text-xs"
                    >
                      Enter Challenge →
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Global Leaderboard Sidebar */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🏆 Peer Leaderboard
            </h2>
            <Card className="p-4 border border-border divide-y divide-border">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry) => (
                  <div key={entry.rank} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-muted-foreground w-4 text-center">
                        #{entry.rank}
                      </span>
                      <div>
                        <p className="font-bold text-foreground">{entry.userName}</p>
                        <p className="text-[10px] text-muted-foreground">{entry.badge}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary text-sm">{entry.totalScore} pts</p>
                      <p className="text-[10px] text-muted-foreground">{entry.challengesCompleted} challenges</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No submissions yet. Be the first to complete a challenge!
                </p>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
