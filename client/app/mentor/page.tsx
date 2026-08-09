"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MentorPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!isLoggedIn) {
        router.push("/login");
      }
    }
  }, [isLoggedIn, authLoading, router]);

  if (authLoading || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">
            🎓 Mentor Review Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review candidate mock interview performances, leave custom feedback notes, and track progress
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border border-border space-y-4">
            <h2 className="text-lg font-bold text-foreground">Recent Submissions For Review</h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-sm">Rohan Sharma - React Domain</p>
                  <p className="text-xs text-muted-foreground">Score: 82/100 • Completed 2h ago</p>
                </div>
                <Button size="sm" className="bg-primary text-white text-xs">Review Output</Button>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-sm">Priya Nair - System Design</p>
                  <p className="text-xs text-muted-foreground">Score: 68/100 • Completed 5h ago</p>
                </div>
                <Button size="sm" className="bg-primary text-white text-xs">Review Output</Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-border space-y-4">
            <h2 className="text-lg font-bold text-foreground">Mentor Quick Actions</h2>
            <div className="space-y-3">
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl">
                ➕ Assign Custom Practice Problem
              </Button>
              <Button variant="outline" className="w-full rounded-xl">
                📊 Export Student Performance Report (PDF)
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
