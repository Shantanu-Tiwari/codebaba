"use client"

import { signIn } from "@/lib/auth-client"
import {
    GithubIcon,
    GitPullRequest,
    Brain,
    Activity,
} from "lucide-react"
import { useState } from "react"

const LoginUI = () => {
    const [isLoading, setIsLoading] = useState(false)

    const handleGithubLogin = async () => {
        setIsLoading(true)
        try {
            await signIn.social({ provider: "github" })
        } catch (error) {
            console.log("Login error:", error)
            setIsLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen bg-background text-foreground">
            <div className="absolute left-6 top-6 flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full border">
                    <img
                        src="/baba-logo.jpg"
                        alt="Code Baba"
                        className="h-full w-full object-cover"
                    />
                </div>

                <div className="leading-tight">
                    <p className="text-sm font-semibold tracking-tight">
                        Code Baba
                    </p>
                    <p className="text-xs text-muted-foreground">
                        AI Code Reviewer
                    </p>
                </div>
            </div>
            <div className="flex w-full items-center justify-center px-6 md:w-1/2">
                <div className="w-full max-w-sm space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Sign in to Code Baba
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            AI-powered code reviews for your GitHub PRs
                        </p>
                    </div>

                    <button
                        onClick={handleGithubLogin}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-gray-400 text-black bg-white disabled:opacity-50"
                    >
                        <GithubIcon className="h-4 w-4" />
                        {isLoading ? "Connecting…" : "Continue with GitHub"}
                    </button>

                    <p className="text-center text-xs text-muted-foreground">
                        GitHub OAuth • No passwords stored
                    </p>
                </div>
            </div>
            <div className="hidden md:flex md:w-1/2 items-center border-l bg-muted/40 px-12">
                <div className="max-w-lg space-y-6">
                    <h2 className="text-3xl font-semibold tracking-tight">
                        Your AI reviewer for every pull request
                    </h2>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Code Baba automatically reviews your GitHub pull requests using
                        Gemini-powered AI with full codebase context — no manual setup, no
                        noise.
                    </p>

                    <ul className="space-y-4 text-sm">
                        <li className="flex items-start gap-3">
                            <Brain className="h-4 w-4 mt-0.5 text-primary" />
                            Context-aware PR reviews using RAG and vector search
                        </li>
                        <li className="flex items-start gap-3">
                            <GitPullRequest className="h-4 w-4 mt-0.5 text-primary" />
                            Automatic GitHub PR comments with summaries, issues, and suggestions
                        </li>
                        <li className="flex items-start gap-3">
                            <Activity className="h-4 w-4 mt-0.5 text-primary" />
                            Track reviews, repositories, and activity from one dashboard
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default LoginUI
