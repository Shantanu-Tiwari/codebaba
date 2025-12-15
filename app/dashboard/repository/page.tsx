"use client"
import React, {useState, useEffect} from "react"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {useRepositories} from "@/module/repository/hooks/use-repositories";
import { ExternalLink } from "lucide-react";
import {useConnectRepository} from "@/module/repository/hooks/use-connect-repository";
import { useQueryClient } from "@tanstack/react-query";

interface Repository {
    id:number
    name: string
    full_name: string
    description: string | null
    html_url: string
    stargazers_count: number
    language: string | null
    topics: string[]
    isConnected?: boolean
    updated_at?: string
    created_at: string
}

const RepositoryPage = () => {
    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useRepositories()
    const connectRepository = useConnectRepository()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("");
    const [connectingRepoId, setConnectingRepoId] = useState<number | null>(null);

    useEffect(() => {
        const handleRepoDisconnected = () => {
            queryClient.invalidateQueries({ queryKey: ["repositories"] })
        }
        window.addEventListener('repository-disconnected', handleRepoDisconnected)
        return () => window.removeEventListener('repository-disconnected', handleRepoDisconnected)
    }, [queryClient])
    
    const getLanguageColor = (language: string) => {
        const colors: Record<string, string> = {
            JavaScript: "bg-yellow-500",
            TypeScript: "bg-blue-500",
            Python: "bg-green-500",
            Java: "bg-orange-500",
            Go: "bg-cyan-500",
            Rust: "bg-red-500",
            PHP: "bg-purple-500",
            Ruby: "bg-red-600",
            C: "bg-gray-600",
            "C++": "bg-pink-500",
            "C#": "bg-green-600",
            Swift: "bg-orange-600",
            Kotlin: "bg-purple-600",
            Dart: "bg-blue-600",
            HTML: "bg-orange-400",
            CSS: "bg-blue-400"
        }
        return colors[language] || "bg-gray-500"
    }

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
                if (hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            }
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const handleConnect = (repo: Repository) => {
        const [owner, repoName] = repo.full_name.split('/');
        setConnectingRepoId(repo.id);
        connectRepository.mutate({
            owner,
            repo: repoName,
            githubId: repo.id
        }, {
            onSuccess: () => {
                // Optimistic update - immediately mark as connected
                queryClient.setQueryData(["repositories"], (oldData: any) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any) => 
                            page.map((r: Repository) => 
                                r.id === repo.id ? { ...r, isConnected: true } : r
                            )
                        )
                    };
                });
                // Also trigger refresh for consistency
                queryClient.invalidateQueries({ queryKey: ["repositories"] })
            },
            onSettled: () => setConnectingRepoId(null)
        });
    }

    const allRepositories = data?.pages.flatMap(page=>page) || []
    const filteredRepositories = allRepositories.filter((repo:Repository)=>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
                <p className="text-muted-foreground">Manage and view all of your repositories</p>
            </div>
            
            <div className="w-full max-w-md lg:max-w-lg">
                <input
                    type="text"
                    placeholder="Search repositories..."
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
            ) : (
                <div className="space-y-4">
                    <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-2 text-sm font-medium text-muted-foreground border-b">
                        <div className="col-span-4">Repository</div>
                        <div className="col-span-2">Language</div>
                        <div className="col-span-2">Stars</div>
                        <div className="col-span-2">Updated</div>
                        <div className="col-span-2">Status</div>
                    </div>
                    {filteredRepositories.map((repo: Repository) => (
                        <Card key={repo.id} className="p-4 md:p-6">
                            {/* Mobile Layout */}
                            <div className="lg:hidden space-y-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{repo.name}</CardTitle>
                                    <a
                                        href={repo.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {repo.description || "No description available"}
                                </CardDescription>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {repo.language && (
                                            <Badge className={`text-xs text-white ${getLanguageColor(repo.language)}`}>{repo.language}</Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">⭐ {repo.stargazers_count}</span>
                                    </div>
                                    {repo.isConnected ? (
                                        <Badge variant="secondary" className="px-3 py-1">
                                            Connected
                                        </Badge>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleConnect(repo)}
                                            disabled={connectingRepoId === repo.id}
                                        >
                                            {connectingRepoId === repo.id ? "Connecting..." : "Connect"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Desktop Layout */}
                            <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-4 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{repo.name}</CardTitle>
                                        <a
                                            href={repo.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                    <CardDescription className="line-clamp-1">
                                        {repo.description || "No description available"}
                                    </CardDescription>
                                    <div className="flex flex-wrap gap-1">
                                        {repo.topics?.slice(0, 2).map((topic) => (
                                            <Badge key={topic} variant="secondary" className="text-xs">
                                                {topic}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    {repo.language && (
                                        <Badge className={`text-white ${getLanguageColor(repo.language)}`}>{repo.language}</Badge>
                                    )}
                                </div>
                                <div className="col-span-2 text-sm text-muted-foreground">
                                    ⭐ {repo.stargazers_count}
                                </div>
                                <div className="col-span-2 text-sm text-muted-foreground">
                                    {new Date(repo.updated_at || repo.created_at).toLocaleDateString()}
                                </div>
                                <div className="col-span-2">
                                    {repo.isConnected ? (
                                        <Badge variant="secondary" className="px-4 py-2">
                                            Connected
                                        </Badge>
                                    ) : (
                                        <Button
                                            onClick={() => handleConnect(repo)}
                                            disabled={connectingRepoId === repo.id}
                                        >
                                            {connectingRepoId === repo.id ? "Connecting..." : "Connect"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                    {isFetchingNextPage && (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <Card key={`loading-${i}`} className="animate-pulse p-6">
                                    <div className="h-4 bg-muted rounded w-3/4"></div>
                                    <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default RepositoryPage;
