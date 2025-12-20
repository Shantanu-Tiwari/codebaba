import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";

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
    console.error("Error fetching GitHub contribution calendar:", error);
    return null;
  }
}

export const getRepositories = async (
  requestHeaders: Headers,
  page: number = 1,
  perPage: number = 10
) => {
  const token = await getGithubToken(requestHeaders);
  const octokit = new Octokit({ auth: token });

  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    direction: "desc",
    visibility: "all",
    per_page: perPage,
    page: page,
  });
  return data;
};

export const createWebhook = async (
  requestHeaders: Headers,
  owner: string,
  repo: string
) => {
  const token = await getGithubToken(requestHeaders);
  const octokit = new Octokit({ auth: token });

  const webhookUrl = `https://www.codebaba.in/api/webhooks/github`;
  const oldWebhookUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`;

  // Check for existing webhooks and update if necessary
  const { data: hooks } = await octokit.rest.repos.listWebhooks({
    owner,
    repo,
  });

  const existingHook = hooks.find(
    (hook) =>
      hook.config.url === oldWebhookUrl || hook.config.url === webhookUrl
  );

  if (existingHook) {
    if (existingHook.config.url !== webhookUrl) {
      // Update the webhook URL
      const { data } = await octokit.rest.repos.updateWebhook({
        owner,
        repo,
        hook_id: existingHook.id,
        config: {
          url: webhookUrl,
          content_type: "json",
        },
        events: ["pull_request"],
      });
      return data;
    } else {
      // Webhook already correct
      return existingHook;
    }
  }

  // Create new webhook
  const { data } = await octokit.rest.repos.createWebhook({
    owner,
    repo,
    config: {
      url: webhookUrl,
      content_type: "json",
    },
    events: ["pull_request"],
  });

  return data;
};

export const deleteWebhook = async (
  requestHeaders: Headers,
  owner: string,
  repo: string
) => {
  const token = await getGithubToken(requestHeaders);
  const octokit = new Octokit({ auth: token });
  const webhookUrl = `https://www.codebaba.in/api/webhooks/github`;
  const oldWebhookUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`;
  try {
    const { data: hooks } = await octokit.rest.repos.listWebhooks({
      owner,
      repo,
    });
    const hookToDelete = hooks.find(
      (hook) =>
        hook.config.url === webhookUrl || hook.config.url === oldWebhookUrl
    );
    if (hookToDelete) {
      await octokit.rest.repos.deleteWebhook({
        owner,
        repo,
        hook_id: hookToDelete.id,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting webhook: ", error);
    return false;
  }
};

export async function getRepoFileContents(
  token: string,
  owner: string,
  repo: string,
  path: string = ""
): Promise<{ path: string; content: string }[]> {
  const octokit = new Octokit({ auth: token });

  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  if (!Array.isArray(data)) {
    if (data.type === "file" && data.content) {
      return [
        {
          path: data.path,
          content: Buffer.from(data.content, "base64").toString("utf-8"),
        },
      ];
    }
    return [];
  }
  let files: { path: string; content: string }[] = [];

  for (const item of data) {
    if (item.type === "file") {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: item.path,
      });
      if (
        !Array.isArray(fileData) &&
        fileData.type === "file" &&
        fileData.content
      ) {
        if (!item.path.match(/\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz)$/i)) {
          files.push({
            path: item.path,
            content: Buffer.from(fileData.content, "base64").toString("utf-8"),
          });
        }
      }
    } else if (item.type === "dir") {
      const subFiles = await getRepoFileContents(token, owner, repo, item.path);
      files = files.concat(subFiles);
    }
  }
  return files;
}

export async function getPullRequestDiff(
  token: string,
  owner: string,
  repo: string,
  prNumber: string
) {
  const octokit = new Octokit({ auth: token });

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: Number(prNumber),
  });
  const { data: diff } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: Number(prNumber),
    mediaType: {
      format: "diff",
    },
  });

  return {
    diff: diff as unknown as string,
    title: pr.title,
    description: pr.body || "",
  };
}

export async function postReviewComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  review: string
) {
  const octokit = new Octokit({ auth: token });

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: `
## 🤖 Code BaBa — Automated PR Review

${review}

---

<sub>
Reviewed by <b>Code BaBa</b> · AI-powered pull request reviews focused on correctness, safety, and merge confidence.
</sub>
    `.trim(),
  });
}
