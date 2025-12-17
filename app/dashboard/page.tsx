"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import GitHubCalendar from "react-github-contribution-calendar";
import { useTheme } from "next-themes";

import StatCard from "@/components/dashboard/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  GitCommit,
  GitPullRequest,
  FolderGit2,
  MessageSquareCode,
} from "lucide-react";

type DashboardStats = {
  totalCommits: number;
  totalPRs: number;
  totalReviews: number;
  totalRepos: number;
};

type MonthlyActivity = {
  name: string;
  commits: number;
  prs: number;
  reviews: number;
};

type ContributionData = Record<string, number>;

const MainPage = () => {
  const { resolvedTheme } = useTheme();
  const {
    data: stats,
    isLoading: isStatsLoading,
    error: statsError,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }

      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const {
    data: monthlyActivity,
    isLoading: isActivityLoading,
    error: activityError,
  } = useQuery<MonthlyActivity[]>({
    queryKey: ["monthly-activity"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activity", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch monthly activity");
      }

      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const { data: contributionData, isLoading: isContributionLoading } =
    useQuery<ContributionData>({
      queryKey: ["contribution-calendar"],
      queryFn: async () => {
        const res = await fetch("/api/dashboard/contributions", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch contributions");
        }

        return res.json();
      },
      refetchOnWindowFocus: false,
    });

  return (
    <div className="space-y-10">
      {/* ================= Header ================= */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your GitHub activity and AI code reviews.
        </p>
      </div>

      {/* ================= Error State ================= */}
      {(statsError || activityError) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load dashboard data. Please reconnect your GitHub account.
        </div>
      )}

      {/* ================= Stats Cards ================= */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Commits"
            value={stats?.totalCommits ?? 0}
            icon={GitCommit}
            loading={isStatsLoading}
          />

          <StatCard
            title="Pull Requests"
            value={stats?.totalPRs ?? 0}
            icon={GitPullRequest}
            loading={isStatsLoading}
          />

          <StatCard
            title="Code Reviews"
            value={stats?.totalReviews ?? 0}
            icon={MessageSquareCode}
            loading={isStatsLoading}
          />

          <StatCard
            title="Repositories"
            value={stats?.totalRepos ?? 0}
            icon={FolderGit2}
            loading={isStatsLoading}
          />
        </div>
      </section>

      {/* ================= Contribution Heatmap ================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Contribution Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Your GitHub contribution heatmap for the past year.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-6">
          {isContributionLoading ? (
            <div className="h-48 w-full animate-pulse rounded bg-muted" />
          ) : contributionData && Object.keys(contributionData).length > 0 ? (
            <GitHubCalendar
              values={contributionData}
              until={new Date().toISOString().split("T")[0]}
              panelColors={
                resolvedTheme === "dark"
                  ? ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"]
                  : ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"]
              }
              weekLabelAttributes={{}}
              monthLabelAttributes={{}}
              panelAttributes={{}}
              key={resolvedTheme}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No contribution data available.
            </p>
          )}
        </div>
      </section>

      {/* ================= Monthly Activity Chart ================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Monthly Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Your last 6 months of GitHub activity.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-6">
          {isActivityLoading ? (
            <div className="h-48 w-full animate-pulse rounded bg-muted" />
          ) : monthlyActivity?.length ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="commits" fill="#8884d8" name="Commits" />
                  <Bar dataKey="prs" fill="#82ca9d" name="Pull Requests" />
                  <Bar dataKey="reviews" fill="#ffc658" name="Reviews" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No activity data available.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default MainPage;
