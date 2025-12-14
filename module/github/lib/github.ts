import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export const getGithubToken = async (
    requestHeaders: Headers
): Promise<string> => {
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const account = await prisma.account.findFirst({
        where: {
            userId: session.user.id,
            providerId: "github",
        },
        select: {
            accessToken: true,
        },
    });

    if (!account?.accessToken) {
        throw new Error("No github access token found");
    }

    return account.accessToken;
};

export async function fetchUserContribution(
    token: string,
    _username: string // username no longer needed
) {
    const octokit = new Octokit({ auth: token });

    const query = `
    query {
      viewer {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                color
              }
            }
          }
        }
      }
    }
  `;

    try {
        const response: any = await octokit.graphql(query);

        return response.viewer.contributionsCollection.contributionCalendar;
    } catch (error) {
        console.error(
            "Error fetching GitHub contribution calendar:",
            error
        );
        return null;
    }
}
