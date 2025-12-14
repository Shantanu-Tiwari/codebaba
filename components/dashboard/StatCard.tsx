"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    loading?: boolean;
}

export default function StatCard({
                                     title,
                                     value,
                                     icon: Icon,
                                     loading,
                                 }: StatCardProps) {
    return (
        <Card
            className={cn(
                "relative overflow-hidden rounded-xl border bg-background",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            )}
        >
            <div className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{title}</p>

                    {loading ? (
                        <div className="h-8 w-20 rounded bg-muted animate-pulse" />
                    ) : (
                        <h2 className="text-2xl font-bold tracking-tight">
                            {value.toLocaleString()}
                        </h2>
                    )}
                </div>

                <div className="rounded-lg bg-muted p-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
            </div>
        </Card>
    );
}
