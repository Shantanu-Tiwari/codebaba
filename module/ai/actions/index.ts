"use server";

import prisma from "@/lib/db";
import { getPullRequestDiff } from "@/module/github/lib/github";
import { inngest } from "@/inngest/client";
import {
  canCreateReview,
  incrementReviewCount,
} from "@/module/payment/lib/subscription";

export async function reviewPullRequest(
  owner: string,
  repo: string,
  prNumber: number
) {
  try {
    const repository = await prisma.repository.findFirst({
      where: {
        owner,
        name: repo,
      },
      include: {
        user: {
          include: {
            accounts: {
              where: {
                providerId: "github",
              },
            },
          },
        },
      },
    });
    if (!repository) {
      throw new Error(
        `Repository ${owner}/${repo} not found in database. Please reconnect the repository.`
      );
    }
    const canReview = await canCreateReview(repository.user.id, repository.id);

    if (!canReview) {
      throw new Error(
        "Review limit reached for this repository, Please upgrade to Pro for unlimited reviews."
      );
    }
    const githubAccount = repository.user.accounts[0];
    if (!githubAccount?.accessToken) {
      throw new Error("No Github access token found for repository owner");
    }
    const token = githubAccount.accessToken;
    const { title } = await getPullRequestDiff(
      token,
      owner,
      repo,
      prNumber.toString()
    );

    console.log("Sending inngest event for PR review:", {
      owner,
      repo,
      prNumber,
      userId: repository.user.id,
    });
    try {
      await inngest.send({
        id: `pr-review-${owner}-${repo}-${prNumber}-${Date.now()}`,
        name: "pr.review.requested",
        data: {
          owner,
          repo,
          prNumber,
          userId: repository.user.id,
        },
      });
      console.log("Inngest event sent successfully");
    } catch (sendError) {
      console.error("Failed to send inngest event:", sendError);
      throw sendError;
    }

    await incrementReviewCount(repository.user.id, repository.id);
    return { success: true, message: "Review Queued" };
  } catch (error) {
    try {
      const repository = await prisma.repository.findFirst({
        where: { owner, name: repo },
      });
      if (repository) {
        await prisma.review.create({
          data: {
            repositoryId: repository.id,
            prNumber,
            prTitle: "Failed to fetch PR",
            prUrl: `https://github.com/${owner}/pull/${prNumber}`,
            review: `Error: ${
              error instanceof Error ? error.message : "Unknown Error"
            }`,
            status: "Failed",
          },
        });
      }
    } catch (dberror) {
      console.error("Failed to save error to database: ", dberror);
    }
  }
}
