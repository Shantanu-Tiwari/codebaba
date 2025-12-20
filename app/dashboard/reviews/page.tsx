"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, GitPullRequest } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getReviews } from "@/module/review/actions";

interface Review {
  id: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  review: string;
  status: string;
  createdAt: string;
  repository: {
    name: string;
    fullName: string;
    owner: string;
  };
}

interface RawReview extends Omit<Review, "createdAt"> {
  createdAt: Date;
}

const ReviewsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: reviews,
    isLoading,
    error,
  } = useQuery<Review[]>({
    queryKey: ["reviews"],
    queryFn: async (): Promise<Review[]> => {
      const data = await getReviews();
      return data.map((review: RawReview) => ({
        ...review,
        createdAt: review.createdAt.toISOString(),
      }));
    },
    refetchOnWindowFocus: false,
  });

  const filteredReviews =
    reviews?.filter(
      (review) =>
        review.prTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.repository.fullName
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    ) || [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          View all AI-generated code reviews
        </p>
      </div>

      <div className="w-full max-w-md lg:max-w-lg">
        <input
          type="text"
          placeholder="Search reviews..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse p-6">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-6">
          <p className="text-destructive">Failed to load reviews</p>
        </Card>
      ) : filteredReviews.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground">No reviews found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Headers */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-2 text-sm font-medium text-muted-foreground border-b">
            <div className="col-span-4">Pull Request</div>
            <div className="col-span-3">Repository</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Actions</div>
          </div>

          {filteredReviews.map((review) => (
            <Card key={review.id} className="p-4 md:p-6">
              {/* Mobile Layout */}
              <div className="lg:hidden space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      #{review.prNumber} {review.prTitle}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {review.repository.fullName}
                    </p>
                  </div>
                  <a
                    href={review.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs text-white ${getStatusColor(
                        review.status
                      )}`}
                    >
                      {review.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      #{review.prNumber} {review.prTitle}
                    </CardTitle>
                  </div>
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-muted-foreground">
                    {review.repository.fullName}
                  </p>
                </div>
                <div className="col-span-2">
                  <Badge
                    className={`text-white ${getStatusColor(review.status)}`}
                  >
                    {review.status}
                  </Badge>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-1">
                  <a
                    href={review.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
