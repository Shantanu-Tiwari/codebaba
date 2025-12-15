import {NextRequest, NextResponse} from "next/server";
import {reviewPullRequest} from "@/module/ai/actions";

export async function POST(req:NextRequest){
    try {
        console.log("Webhook received:", req.headers.get("x-github-event"));
        const body = await req.json();
        const event = req.headers.get("x-github-event");

        if (event === "ping") {
            console.log("Ping received from GitHub");
            return NextResponse.json({message:"pong"}, {status:200})
        }

        if (event === "pull_request") {
            const action = body.action;
            const repo = body.repository.full_name;
            const prNumber = body.number;

            const [owner, repoName] = repo.split("/");

            if (action === "opened" || action === "synchronize") {
                reviewPullRequest(owner, repoName, prNumber)
                    .then(()=>console.log(`Review completed for ${repo} #${prNumber}`))
                    .catch((error) => console.log(`Review failed for ${repo} #${prNumber}: `, error))
            }
        }
        
        console.log("GitHub event:", event, body);
        return NextResponse.json({message: "Event Processed"}, {status: 200})
    } catch (error) {
        console.error("Error processing webhook: ", error);
        return NextResponse.json({error: "Internal Server Error"}, {status:500});
    }
}