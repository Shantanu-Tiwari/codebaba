import { Pinecone } from "@pinecone-database/pinecone";

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_DB_API_KEY || "dummy_pinecone_key_for_build",
});

export const pineconeIndex = pinecone.index("codebaba");