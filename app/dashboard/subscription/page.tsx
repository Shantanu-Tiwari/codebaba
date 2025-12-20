"use client"
import { checkout, customer } from '@/lib/auth-client'
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubscriptionData, syncSubscriptionStatus } from "@/module/payment/action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, X, Crown, RefreshCw, CreditCard, Settings } from "lucide-react";
import { toast } from "sonner";

const PLAN_FEATURES = {
    free: [
        { name: "Up to 5 repositories", included: true },
        { name: "Up to 5 reviews per repository", included: true },
        { name: "Basic code review", included: true },
        { name: "Community support", included: true },
        { name: "Advanced analytics", included: false },
        { name: "Priority support", included: false },
    ],
    pro: [
        { name: "Unlimited repositories", included: true },
        { name: "Unlimited reviews", included: true },
        { name: "Advanced code reviews", included: true },
        { name: "Email Support", included: true },
        { name: "Advanced analytics", included: true },
        { name: "Priority support", included: true },
    ]
}

export default function SubscriptionPage() {
    const [checkoutLoading, setCheckoutLoading] = useState(false)
    const [portalLoading, setPortalLoading] = useState(false)
    const searchParams = useSearchParams()
    const success = searchParams.get("success")
    const queryClient = useQueryClient()

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["subscription-data"],
        queryFn: getSubscriptionData,
        refetchOnWindowFocus: true
    });

    const syncMutation = useMutation({
        mutationFn: syncSubscriptionStatus,
        onSuccess: (result) => {
            if (result.success) {
                toast.success("Subscription status synced successfully");
                queryClient.invalidateQueries({ queryKey: ["subscription-data"] });
            } else {
                toast.error(result.error || "Failed to sync subscription");
            }
        },
        onError: () => {
            toast.error("Failed to sync subscription status");
        }
    });

    const handleUpgrade = async () => {
        if (!process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID) {
            toast.error("Product ID not configured");
            return;
        }
        
        try {
            setCheckoutLoading(true);
            console.log("Starting checkout with product ID:", process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID);
            await checkout({
                slug: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID,
                successUrl: `${window.location.origin}/dashboard/subscription?success=true`,
                cancelUrl: `${window.location.origin}/dashboard/subscription`
            });
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error(`Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        try {
            await customer.portal();
        } catch (error) {
            toast.error("Failed to open customer portal");
        } finally {
            setPortalLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
                    <p className="text-muted-foreground">Manage your subscription and billing</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {[...Array(2)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-6 bg-muted rounded w-1/2"></div>
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, j) => (
                                        <div key={j} className="h-4 bg-muted rounded"></div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data?.user) {
        return (
            <div className="space-y-6">
                <div className="text-3xl font-bold tracking-tight">Subscription Plans</div>
                <p className="text-muted-foreground">Please sign in to view subscription options</p>
            </div>
        );
    }

    const { user, limits } = data;
    const currentTier = user.subscriptionTier as "FREE" | "PRO";
    const isPro = currentTier === "PRO";
    const isActive = user.subscriptionStatus === "ACTIVE";

    const handleSync = () => {
        syncMutation.mutate();
    };

    return (
        <div className="space-y-6">
            {success && (
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-600" />
                            <p className="text-green-800 dark:text-green-200">
                                Subscription activated successfully! Welcome to Pro.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
                <p className="text-muted-foreground">Manage your subscription and billing</p>
            </div>

            {/* Current Plan */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {isPro && <Crown className="h-5 w-5 text-yellow-500" />}
                                Current Plan: {user.subscriptionTier}
                                {isPro && (
                                    <Badge variant={isActive ? "default" : "secondary"}>
                                        {user.subscriptionStatus || "Unknown"}
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                {isPro ? "You have access to all premium features" : "You're on the free plan"}
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncMutation.mutate()}
                            disabled={syncMutation.isPending}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                            Sync Status
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {limits && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Repositories</span>
                                    <span>
                                        {limits.repositories.current}
                                        {limits.repositories.limit ? `/${limits.repositories.limit}` : " (Unlimited)"}
                                    </span>
                                </div>
                                <Progress
                                    value={limits.repositories.limit ? (limits.repositories.current / limits.repositories.limit) * 100 : 0}
                                    className="h-2"
                                />
                            </div>
                            
                            {Object.keys(limits.reviews).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Reviews per Repository</h4>
                                    <div className="space-y-2">
                                        {Object.entries(limits.reviews).slice(0, 3).map(([repoId, review]) => (
                                            <div key={repoId} className="text-xs">
                                                <div className="flex justify-between mb-1">
                                                    <span className="truncate">Repository {repoId.slice(-8)}</span>
                                                    <span>
                                                        {review.current}
                                                        {review.limit ? `/${review.limit}` : " (Unlimited)"}
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={review.limit ? (review.current / review.limit) * 100 : 0}
                                                    className="h-1"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pricing Plans */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Free Plan */}
                <Card className={!isPro ? "border-primary" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Free
                            {!isPro && <Badge>Current</Badge>}
                        </CardTitle>
                        <CardDescription>
                            <span className="text-3xl font-bold">$0</span>
                            <span className="text-muted-foreground">/month</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {PLAN_FEATURES.free.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    {feature.included ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className={feature.included ? "" : "text-muted-foreground"}>
                                        {feature.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {isPro && (
                            <Button
                                variant="outline"
                                className="w-full mt-6"
                                onClick={handleManageSubscription}
                                disabled={portalLoading}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                {portalLoading ? "Loading..." : "Downgrade"}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className={isPro ? "border-primary" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-yellow-500" />
                                Pro
                            </div>
                            {isPro && <Badge>Current</Badge>}
                        </CardTitle>
                        <CardDescription>
                            <span className="text-3xl font-bold">$29</span>
                            <span className="text-muted-foreground">/month</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {PLAN_FEATURES.pro.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    <span>{feature.name}</span>
                                </li>
                            ))}
                        </ul>
                        {!isPro ? (
                            <Button
                                className="w-full mt-6"
                                onClick={handleUpgrade}
                                disabled={checkoutLoading}
                            >
                                <CreditCard className="h-4 w-4 mr-2" />
                                {checkoutLoading ? "Loading..." : "Upgrade to Pro"}
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full mt-6"
                                onClick={handleManageSubscription}
                                disabled={portalLoading}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                {portalLoading ? "Loading..." : "Manage Subscription"}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}