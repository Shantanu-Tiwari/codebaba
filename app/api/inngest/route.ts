import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { indexRepo, generateReview } from "@/inngest/functions";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [indexRepo, generateReview],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
