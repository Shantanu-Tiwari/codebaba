"use server";
import { auth } from "@/lib/auth";
import { getRemainingLimits, updateUserTier } from "@/module/payment/lib/subscription";
import { headers } from "next/headers";
import { polarClient } from "@/module/payment/config/polar";
import prisma from "@/lib/db";

export interface SubscriptionData {
    user: {
        id: string;
        name: string;
        email: string;
        subscriptionTier: string;
        subscriptionStatus: string | null;
        polarCustomerId: string | null;
        polarSubscriptionId: string | null;
    } | null;
    limits: {
        tier: "FREE" | "PRO";
        repositories: {
            current: number;
            limit: number | null;
            canAdd: boolean;
        };
        reviews: {
            [repositoryId: string]: {
                current: number;
                limit: number | null;
                canAdd: boolean;
            };
        };
    } | null;
}

export async function getSubscriptionData(): Promise<SubscriptionData> {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return { user: null, limits: null };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return { user: null, limits: null };
        }

        // Auto-sync subscription status if user has polarCustomerId
        if (user.polarCustomerId) {
            try {
                const syncResult = await syncSubscriptionStatus();
                if (syncResult.success) {
                    // Refetch user data after sync
                    const updatedUser = await prisma.user.findUnique({
                        where: { id: session.user.id }
                    });
                    if (updatedUser) {
                        user.subscriptionTier = updatedUser.subscriptionTier;
                        user.subscriptionStatus = updatedUser.subscriptionStatus;
                    }
                }
            } catch (error) {
                console.log("Auto-sync failed, continuing with current data");
            }
        }

        const limits = await getRemainingLimits(user.id);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                subscriptionTier: user.subscriptionTier || "FREE",
                subscriptionStatus: user.subscriptionStatus || null,
                polarCustomerId: user.polarCustomerId || null,
                polarSubscriptionId: user.polarSubscriptionId || null,
            },
            limits,
        };
    } catch (error) {
        console.error("Error in getSubscriptionData:", error);
        throw error;
    }
}

export async function syncSubscriptionStatus() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (!user) {
        return { success: false, message: "User not found" };
    }

    console.log("User data:", { 
        id: user.id, 
        email: user.email, 
        polarCustomerId: user.polarCustomerId,
        subscriptionTier: user.subscriptionTier 
    });

    if (!user.polarCustomerId) {
        // Try to find customer by email
        try {
            const customers = await polarClient.customers.list({
                email: user.email
            });
            
            if (customers.result?.items?.length > 0) {
                const customer = customers.result.items[0];
                await prisma.user.update({
                    where: { id: user.id },
                    data: { polarCustomerId: customer.id }
                });
                user.polarCustomerId = customer.id;
                console.log("Found and linked Polar customer:", customer.id);
            } else {
                return { success: false, message: "No Polar customer found for this email" };
            }
        } catch (error) {
            console.error("Error finding customer:", error);
            return { success: false, message: "Failed to find Polar customer" };
        }
    }

    try {
        // Fetch subscriptions from Polar
        const result = await polarClient.subscriptions.list({
            customerId: user.polarCustomerId,
        });

        const subscriptions = result.result?.items || [];

        // Find the most relevant subscription (active or most recent)
        const activeSub = subscriptions.find((sub: any) => sub.status === 'active');
        const latestSub = subscriptions[0];

        if (activeSub) {
            await updateUserTier(user.id, "PRO", "ACTIVE", activeSub.id);
            return { success: true, status: "ACTIVE" };
        } else if (latestSub) {
            // If latest is canceled/expired
            const status = latestSub.status === 'canceled' ? 'CANCELED' : 'EXPIRED';
            await updateUserTier(user.id, "FREE", status, latestSub.id);
            return { success: true, status };
        }

        // No subscriptions found - downgrade to FREE
        await updateUserTier(user.id, "FREE", "EXPIRED");
        return { success: true, status: "NO_SUBSCRIPTION" };
    } catch (error) {
        console.error("Failed to sync subscription:", error);
        return { success: false, error: "Failed to sync with Polar" };
    }
}

export async function manualUpgradeToProForTesting() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    await updateUserTier(session.user.id, "PRO", "ACTIVE");
    return { success: true, message: "Manually upgraded to Pro for testing" };
}