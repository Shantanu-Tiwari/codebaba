import { inngest } from "../client";
import { getPullRequestDiff, postReviewComment } from "@/module/github/lib/github";
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

        /**
         * 3. Fetch recent PRs for duplicate / overlap detection
         */
        const recentPRs = await step.run("fetch-recent-prs", async () => {
            const prs: any[] = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=20`,
                {
                    headers: {
                        Authorization: `token ${token}`,
                        Accept: "application/vnd.github+json",
                    },
                }
            ).then((r) => r.json());

            return prs
                .filter((pr) => pr.number !== prNumber)
                .map(
                    (pr) =>
                        `#${pr.number}: ${pr.title}\n${pr.body || "No description"}`
                );
        });

        /**
         * 4. Generate AI review
         */
        const review = await step.run("generate-ai-review", async () => {
            const prompt = `
You are a senior software engineer and professional code reviewer with 10+ years of experience reviewing production pull requests across frontend, backend, and infrastructure systems.

Your goal is to deliver a **clear, accurate, and actionable** pull request review that helps teams make confident merge decisions.

---

## Pull Request Metadata
- **Title**: ${title}
- **Description**: ${description || "No description provided"}

---

## Codebase Context
Use this to understand existing patterns, conventions, and architectural intent. Do not assume anything beyond what is provided.

${context.join("\n\n")}

---

## Recent Pull Requests (for overlap or duplicate detection)
${recentPRs.slice(0, 10).join("\n\n")}

---

## Code Changes
\`\`\`diff
${diff}
\`\`\`

---

## Review Principles
- Base feedback strictly on the provided diff and context.
- Do not speculate about missing code or future plans.
- Explicitly call out unclear intent or risky assumptions.
- Prefer concrete, specific feedback over generic advice.
- Reference file names and line ranges where applicable.
- Avoid style nitpicks unless they impact readability, safety, or maintainability.

---

## Required Output Sections (in order)

### 1. Duplicate / Overlap Check
Classify as **Potential Duplicate**, **Partial Overlap**, or **No Overlap**, with reasoning.

### 2. Change Walkthrough
File-by-file explanation of what changed and why it matters.

### 3. Flow Visualization (Optional)
If applicable, include a simple Mermaid sequence diagram.
Otherwise, explicitly state: *No meaningful execution flow changes introduced.*

### 4. Summary
Concise overview of intent and impact.

### 5. Strengths
What is done well.

### 6. Issues & Risks
List issues with severity:
- **Blocking**
- **Non-blocking**
- **Suggestion**

### 7. Suggestions & Improvements
Concrete, actionable improvements only.

### 8. Merge Readiness
One of:
- **Ready to merge**
- **Needs changes before merge**
- **Needs discussion**
With brief justification.
`;

            const { text } = await generateText({
                model: google("gemini-2.5-flash"),
                prompt,
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
