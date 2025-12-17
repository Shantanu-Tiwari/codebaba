"use server";

import { auth } from "@/lib/auth";
import { getRemainingLimits, updateUserTier, type SubscriptionTier, type SubscriptionStatus } from "@/module/payment/lib/subscription";
import { headers } from "next/headers";
import { polarClient } from "@/module/payment/config/polar";
import prisma from "@/lib/db";

export interface SubscriptionData {
    user: {
        id: string;
        name: string;
        email: string;
        subscriptionTier: SubscriptionTier;
        subscriptionStatus: SubscriptionStatus | null;
        polarCustomerId: string | null;
        polarSubscriptionId: string | null;
    } | null;
    limits: {
        tier: SubscriptionTier;
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

        // Auto-sync subscription status for users with Polar integration
        if (user.polarCustomerId) {
            try {
                const syncResult = await syncSubscriptionStatus();
                if (!syncResult.success) {
                    console.warn("Subscription sync returned:", syncResult.message);
                }
                // Refetch updated user data
                const updatedUser = await prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: {
                        subscriptionTier: true,
                        subscriptionStatus: true
                    }
                });
                if (updatedUser) {
                    user.subscriptionTier = updatedUser.subscriptionTier;
                    user.subscriptionStatus = updatedUser.subscriptionStatus;
                }
            } catch (error) {
                // Continue with existing data if sync fails
                console.warn("Subscription auto-sync failed:", error);
            }
        }

        const limits = await getRemainingLimits(user.id);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                subscriptionTier: (user.subscriptionTier as SubscriptionTier) || "FREE",
                subscriptionStatus: (user.subscriptionStatus as SubscriptionStatus) || null,
                polarCustomerId: user.polarCustomerId,
                polarSubscriptionId: user.polarSubscriptionId,
            },
            limits,
        };
    } catch (error) {
        console.error("Failed to fetch subscription data:", error);
        throw new Error("Unable to retrieve subscription information");
    }
}

/**
 * Synchronizes user subscription status with Polar
 * Automatically links Polar customers and updates subscription tiers
 */
export async function syncSubscriptionStatus() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return { success: false, message: "Authentication required" };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                polarCustomerId: true,
                subscriptionTier: true
            }
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        // Link Polar customer if not already connected
        if (!user.polarCustomerId) {
            const customer = await findAndLinkPolarCustomer(user.id, user.email);
            if (!customer) {
                return { success: false, message: "No Polar customer found for this email" };
            }
            user.polarCustomerId = customer;
        }

        // Fetch and process user subscriptions
        const result = await polarClient.subscriptions.list({
            customerId: user.polarCustomerId,
        });

        const subscriptions = result.result?.items || [];
        const activeSub = subscriptions.find((sub: any) => sub.status === 'active');
        const latestSub = subscriptions[0];

        if (activeSub) {
            await updateUserTier(user.id, "PRO", "ACTIVE", activeSub.id);
            return { success: true, status: "ACTIVE" };
        } 
        
        if (latestSub) {
            const status = latestSub.status === 'canceled' ? 'CANCELED' : 'EXPIRED';
            await updateUserTier(user.id, "FREE", status as SubscriptionStatus, latestSub.id);
            return { success: true, status };
        }

        // No subscriptions found - set to FREE tier
        await updateUserTier(user.id, "FREE", "EXPIRED");
        return { success: true, status: "NO_SUBSCRIPTION" };
        
    } catch (error) {
        console.error("Subscription sync failed:", error);
        return { success: false, error: "Failed to sync subscription status" };
    }
}

/**
 * Finds and links a Polar customer to the user account
 */
async function findAndLinkPolarCustomer(userId: string, email: string): Promise<string | null> {
    try {
        const customers = await polarClient.customers.list({ email });
        
        if (customers.result?.items?.length > 0) {
            const customer = customers.result.items[0];
            await prisma.user.update({
                where: { id: userId },
                data: { polarCustomerId: customer.id }
            });
            return customer.id;
        }
        
        return null;
    } catch (error) {
        console.error("Failed to find Polar customer:", error);
        return null;
    }
}

/**
 * Retrieves comprehensive subscription data for the authenticated user
 * Includes user information, subscription status, and usage limits
 */