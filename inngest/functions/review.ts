import { inngest } from "@/inngest/client";
import {
  getPullRequestDiff,
  postReviewComment,
} from "@/module/github/lib/github";
import { retrieveContext } from "@/module/ai/lib/rag";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import prisma from "@/lib/db";

export const generateReview = inngest.createFunction(
  { id: "generate-review", concurrency: 5 },
  { event: "pr.review.requested" },

  async ({ event, step }) => {
    const { owner, repo, prNumber, userId } = event.data;

    /**
     * 1. Fetch PR data + GitHub token
     */
    const { diff, title, description, token } = await step.run(
      "fetch-pr-data",
      async () => {
        const account = await prisma.account.findFirst({
          where: {
            userId,
            providerId: "github",
          },
        });

        if (!account?.accessToken) {
          throw new Error("No GitHub access token found for user");
        }

        const prData = await getPullRequestDiff(
          account.accessToken,
          owner,
          repo,
          prNumber
        );

        return {
          ...prData,
          token: account.accessToken,
        };
      }
    );

    /**
     * 2. Retrieve semantic context from codebase (RAG)
     */
    const context = await step.run("retrieve-context", async () => {
      const query = `${title}\n${description || ""}`;
      return retrieveContext(query, `${owner}/${repo}`);
    });

    // Skip duplicate check for now

    /**
     * 4. Generate AI review
     */
    const review = await step.run("generate-ai-review", async () => {
      const prompt = `
You are a senior software engineer reviewing production code. Focus on **security, functionality, and critical issues**.

## Code Changes
\`\`\`diff
${diff}
\`\`\`

## Codebase Context
${context.join("\n\n")}

## Review Requirements

### 1. Security Analysis
- Check for exposed secrets, API keys, or sensitive data
- Validate environment variable usage
- Identify authentication/authorization issues
- Flag potential injection vulnerabilities

### 2. Critical Issues
- Runtime errors or breaking changes
- Performance bottlenecks
- Data integrity problems
- Missing error handling

### 3. Code Quality
- Type safety issues
- Logic errors
- Resource leaks
- Inconsistent patterns

### 4. Environment & Configuration
- Missing environment variables
- Configuration errors
- Deployment risks

## Output Format

**Security Issues:**
[List any security concerns with severity: CRITICAL/HIGH/MEDIUM]

**Critical Issues:**
[List blocking issues that prevent deployment]

**Code Quality:**
[List important quality issues]

**Environment Check:**
[Verify required environment variables and configuration]

**Summary:**
[Brief assessment and merge recommendation]

**Merge Status:** Ready to merge | Needs fixes | Needs discussion

Focus on **actionable feedback** with specific file references and line numbers where applicable.`;

      const { text } = await generateText({
        model: google("gemini-2.5-flash"),
        prompt,
        maxOutputTokens: 2000,
        temperature: 0.3,
      });

      return text;
    });

    /**
     * 5. Post review as PR comment
     */
    await step.run("post-review-comment", async () => {
      await postReviewComment(token, owner, repo, prNumber, review);
    });

    /**
     * 6. Persist review for analytics / dashboard / billing
     */
    await step.run("save-review", async () => {
      const repository = await prisma.repository.findFirst({
        where: { owner, name: repo },
      });

      if (!repository) return;

      await prisma.review.create({
        data: {
          repositoryId: repository.id,
          prNumber,
          prTitle: title,
          prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
          review,
          status: "completed",
        },
      });
    });

    return { success: true };
  }
);
