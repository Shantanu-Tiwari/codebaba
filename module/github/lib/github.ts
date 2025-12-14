import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import {headers} from "next/headers";

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

export const getRepositories = async (requestHeaders: Headers, page: number = 1, perPage: number = 10) => {
    const token = await getGithubToken(requestHeaders);
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        direction: "desc",
        visibility: "all",
        per_page: perPage,
        page: page
    });
    return data;
}

export const createWebhook = async (requestHeaders: Headers, owner: string, repo:string) => {
    const token = await getGithubToken(requestHeaders);
    const octokit = new Octokit({auth:token});

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`

    // Skip checking existing webhooks for faster connection
    const {data} = await octokit.rest.repos.createWebhook({
        owner,
        repo,
        config:{
            url:webhookUrl,
            content_type:"json"
        },
        events:["pull_request"]
    });

    return data;
}

export const deleteWebhook = async (requestHeaders: Headers, owner: string, repo: string)=>{
    const token = await getGithubToken(requestHeaders);
    const octokit = new Octokit({auth:token})
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`;
    try {
        const {data:hooks} = await octokit.rest.repos.listWebhooks({
            owner,
            repo
        });
        const hookToDelete = hooks.find(hook=> hook.config.url === webhookUrl);
        if (hookToDelete){
            await octokit.rest.repos.deleteWebhook({
                owner,
                repo,
                hook_id: hookToDelete.id
            })
            return true
        }
        return false
    }catch (error) {
        console.error("Error deleting webhook: ", error);
        return false;
    }



}
