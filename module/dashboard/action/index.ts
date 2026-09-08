import { fetchUserContribution, getGithubToken } from "@/module/github/lib/github";
import { auth } from "@/lib/auth";
import { Octokit } from "octokit";
import prisma from "@/lib/db";

/**
 * Dashboard summary stats
 */
export async function getDashboardStats(requestHeaders: Headers) {
    try {
        const session = await auth.api.getSession({
            headers: requestHeaders,
        });

        if (!session?.user?.id) {
            throw new Error("Unauthorized");
        }

        const token = await getGithubToken(requestHeaders);
        const octokit = new Octokit({ auth: token });

        // Parallel requests for better performance
        const [userResponse, calendarData, prsResponse, reposResponse] = await Promise.all([
            octokit.rest.users.getAuthenticated(),
            fetchUserContribution(token, ""),
            octokit.rest.search.issuesAndPullRequests({
                q: `type:pr author:@me`,
                per_page: 1,
            }),
            (async () => {
                let allRepos = [];
                let page = 1;
                let hasMore = true;
                
                while (hasMore) {
                    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
                        per_page: 100,
                        page: page
                    });
                    allRepos.push(...repos);
                    hasMore = repos.length === 100;
                    page++;
                }
                return { data: allRepos };
            })()
        ]);

        const reviewCount = await prisma.review.count({
            where: {
                repository: {
                    userId: session.user.id,
                },
            },
        });

        return {
            totalCommits: calendarData?.totalContributions ?? 0,
            totalPRs: prsResponse.data.total_count,
            totalReviews: reviewCount,
            totalRepos: reposResponse.data.length,
        };
    } catch (error) {
        console.error("Error fetching stats:", error);
        return {
            totalCommits: 0,
            totalPRs: 0,
            totalReviews: 0,
            totalRepos: 0,
        };
    }
}

/**
 * Contribution calendar data
 */
export async function getContributionCalendar(requestHeaders: Headers) {
    try {
        const session = await auth.api.getSession({
            headers: requestHeaders,
        });

        if (!session?.user?.id) {
            throw new Error("Unauthorized");
        }

        const token = await getGithubToken(requestHeaders);
        const octokit = new Octokit({ auth: token });

        const { data: user } = await octokit.rest.users.getAuthenticated();
        const calendar = await fetchUserContribution(token, user.login);

        if (!calendar) return [];

        const contributions: Record<string, number> = {};
        calendar.weeks.forEach((week: any) => {
            week.contributionDays.forEach((day: any) => {
                contributions[day.date] = day.contributionCount;
            });
        });

        return contributions;
    } catch (error) {
        console.error("Error occurred:", error);
        return [];
    }
}

/**
 * Monthly activity (last 6 months)
 */
export async function getMonthlyActivity(requestHeaders: Headers) {
    try {
        const session = await auth.api.getSession({
            headers: requestHeaders,
        });

        // ✅ FIX: correct session shape
        if (!session?.user?.id) {
            throw new Error("Unauthorized");
        }

        const token = await getGithubToken(requestHeaders);
        const octokit = new Octokit({ auth: token });

        const { data: user } = await octokit.rest.users.getAuthenticated();
        const calendar = await fetchUserContribution(token, user.login);

        if (!calendar) return [];

        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];

        const monthlyData: Record<
            string,
            { commits: number; prs: number; reviews: number }
        > = {};

        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = monthNames[date.getMonth()];
            monthlyData[monthKey] = { commits: 0, prs: 0, reviews: 0 };
        }

        // Commits from contribution calendar
        calendar.weeks.forEach((week: any) => {
            week.contributionDays.forEach((day: any) => {
                const date = new Date(day.date);
                const monthKey = monthNames[date.getMonth()];
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].commits += day.contributionCount;
                }
            });
        });

        // Real reviews from the database
        const sixMonthsAgoDate = new Date();
        sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6);

        const reviews = await prisma.review.findMany({
            where: {
                repository: {
                    userId: session.user.id,
                },
                createdAt: {
                    gte: sixMonthsAgoDate,
                },
            },
            select: { createdAt: true },
        });

        reviews.forEach((review: { createdAt: Date }) => {
            const monthKey = monthNames[review.createdAt.getMonth()];
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].reviews += 1;
            }
        });

        // PRs (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: prs } = await octokit.rest.search.issuesAndPullRequests({
            q: `author:${user.login} type:pr created:>${sixMonthsAgo
                .toISOString()
                .split("T")[0]}`,
            per_page: 100,
        });

        prs.items.forEach((pr) => {
            const date = new Date(pr.created_at);
            const monthKey = monthNames[date.getMonth()];
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].prs += 1;
            }
        });

        return Object.entries(monthlyData).map(([name, data]) => ({
            name,
            ...data,
        }));
    } catch (error) {
        console.error("Error occurred:", error);
        return [];
    }
}
