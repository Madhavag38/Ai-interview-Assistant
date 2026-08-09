"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({ users: 124, interviews: 412, challenges: 89, systemHealth: "Optimal 🟢" });

  useEffect(() => {
    if (!authLoading) {
      if (!isLoggedIn) {
        router.push("/login");
      } else if (user?.role && user.role !== "admin") {
        alert("Access Denied. Admin privileges required.");
        router.push("/dashboard");
      }
    }
  }, [isLoggedIn, authLoading, user, router]);

  if (authLoading || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">
            🛡️ Platform Administration Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Role-Based Access Control (RBAC): System metrics, user roles, and platform activity
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-5 border border-border text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total Users</p>
            <p className="text-3xl font-black text-primary mt-1">{stats.users}</p>
          </Card>
          <Card className="p-5 border border-border text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Interviews Conducted</p>
            <p className="text-3xl font-black text-accent mt-1">{stats.interviews}</p>
          </Card>
          <Card className="p-5 border border-border text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Arena Challenges</p>
            <p className="text-3xl font-black text-green-500 mt-1">{stats.challenges}</p>
          </Card>
          <Card className="p-5 border border-border text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase">System Status</p>
            <p className="text-xl font-bold text-foreground mt-2">{stats.systemHealth}</p>
          </Card>
        </div>

        <Card className="p-6 border border-border space-y-4">
          <h2 className="text-lg font-bold text-foreground">Role Management & Audit Logs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Security Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/20">
                  <td className="p-3 font-semibold">{user?.name || "Admin User"}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">Admin</span></td>
                  <td className="p-3 text-green-600 dark:text-green-400 font-medium">Verified 🟢</td>
                  <td className="p-3"><Button size="sm" variant="outline" className="text-xs">Manage</Button></td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="p-3 font-semibold">Demo Candidate</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">Student</span></td>
                  <td className="p-3 text-green-600 dark:text-green-400 font-medium">Verified 🟢</td>
                  <td className="p-3"><Button size="sm" variant="outline" className="text-xs">Promote to Mentor</Button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
