import { getDashboardStats } from "@/module/dashboard/action";
import {NextRequest} from "next/server";

export async function GET(request: NextRequest) {
    try {
        const data = await getDashboardStats(request.headers);
        return Response.json(data);
    } catch (error) {
        console.error("Dashboard stats API error:", error);

        return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401 }
        );
    }
}
