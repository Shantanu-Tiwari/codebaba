"use client"

import { useEffect, useState } from "react"
import {usePathname, useRouter} from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import {
    BookOpen,
    Github,
    Settings,
    CreditCard,
    LayoutDashboard,
    LogOut,
    ChevronUp,
} from "lucide-react"
import Link from "next/link"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const AppSidebar = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    const { data: session } = useSession()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !session) return null

    const user = session.user
    const userName = user.name || "Guest"
    const userEmail = user.email || ""

    const navigationItems = [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Repositories", url: "/dashboard/repository", icon: Github },
        { title: "Reviews", url: "/dashboard/reviews", icon: BookOpen },
        { title: "Subscription", url: "/dashboard/subscription", icon: CreditCard },
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
    ]

    const isActive = (url: string) =>
        pathname === url || pathname.startsWith(url + "/")

    return (
        <Sidebar className="border-r border-border">
            <SidebarHeader className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 overflow-hidden rounded-full border">
                        <img
                            src="/baba-logo.jpg"
                            alt="Code Baba"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">
            Code Baba
          </span>
                </div>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarMenu>
                    {navigationItems.map((item) => (
                        <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton asChild isActive={isActive(item.url)}>
                                <Link href={item.url} className="flex items-center gap-3">
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="border-t border-border px-4 py-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-white">
                            <div className="h-8 w-8 overflow-hidden rounded-full border">
                                {user.image ? (
                                    <img
                                        src={user.image}
                                        alt={userName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted text-xs font-medium">
                                        {userName[0]}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 leading-tight">
                                <p className="text-sm font-medium">{userName}</p>
                                <p className="text-xs text-muted-foreground break-all">
                                    {userEmail}
                                </p>
                            </div>

                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent side="top" align="start" className="w-[220px]">
                        <DropdownMenuItem
                            onClick={async () => {
                                await signOut()
                                router.push("/login")
                        }}
                            className="flex items-center gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
