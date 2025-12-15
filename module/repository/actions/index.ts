"use server";
import prisma from "@/lib/db"
import {auth} from "@/lib/auth"
import {headers} from "next/headers";
import {createWebhook, getRepositories} from "@/module/github/lib/github";
import {inngest} from "@/inngest/client";

export const fetchRepositories = async (page:number=1, perPage:number=10)=> {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session) {
        throw new Error("Unauthorized")
    }

    // Parallel fetch GitHub repos and connected repo IDs
    const [githubRepos, dbRepos] = await Promise.all([
        getRepositories(await headers(), page, perPage),
        prisma.repository.findMany({
            where: { userId: session.user.id },
            select: { githubId: true } // Only select needed field
        })
    ]);
    
    const connectedRepoIds = new Set(dbRepos.map(repo => repo.githubId));

    return githubRepos.map((repo:any)=> ({
        ...repo,
        isConnected: connectedRepoIds.has(BigInt(repo.id))
    }))
}

export const connectRepository = async (owner: string, repo: string, githubId: number) => {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session) {
        throw new Error("Unauthorized")
    }
    // Check if already connected
    const existing = await prisma.repository.findFirst({
        where: {
            githubId: BigInt(githubId),
            userId: session.user.id
        }
    });
    
    if (existing) {
        throw new Error("Repository already connected");
    }

    const webhook = await createWebhook(await headers(), owner, repo)
    if (webhook) {
        await prisma.repository.create({
            data:{
                githubId:BigInt(githubId),
                name:repo,
                owner,
                fullName:`${owner}/${repo}`,
                url:`http://github.com/${owner}/${repo}`,
                userId: session.user.id
            }
        })
    } else {
        throw new Error("Failed to create webhook");
    }

    try {
        await inngest.send({
            name:"repository.connected",
            data:{
                owner,
                repo,
                userId:session.user.id
            }
        })
    } catch (error) {
        console.error("Failed to trigger repository indexing: ", error);
    }
    return webhook;
}