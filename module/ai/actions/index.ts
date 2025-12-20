"use server";

// Webhook test v2 - Testing with new domain
import prisma from "@/lib/db";
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
  console.log(`Starting review process for ${owner}/${repo} #${prNumber}`);
  try {
    console.log(`Looking for repository ${owner}/${repo}`);
    console.log("About to query prisma");
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
    console.log("Repository found:", !!repository);
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

    console.log("Sending inngest event for PR review:", {
      owner,
      repo,
      prNumber,
      userId: repository.user.id,
    });
    try {
      console.log(`Sending inngest event for ${owner}/${repo} #${prNumber}`);
      console.log("Inngest client:", inngest);
      const result = await inngest.send({
        id: `pr-review-${owner}-${repo}-${prNumber}-${Date.now()}`,
        name: "pr.review.requested",
        data: {
          owner,
          repo,
          prNumber,
          userId: repository.user.id,
        },
      });
      console.log("Inngest send result:", result);
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
