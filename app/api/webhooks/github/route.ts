import {NextRequest, NextResponse} from "next/server";

export async function POST(req:NextRequest){
    try {
        console.log("Webhook received:", req.headers.get("x-github-event"));
        const body = await req.json();
        const event = req.headers.get("x-github-event");

        if (event === "ping") {
            console.log("Ping received from GitHub");
            return NextResponse.json({message:"pong"}, {status:200})
        }
        
        console.log("GitHub event:", event, body);
        return NextResponse.json({message: "Event Processed"}, {status: 200})
    } catch (error) {
        console.error("Error processing webhook: ", error);
        return NextResponse.json({error: "Internal Server Error"}, {status:500});
    }
}