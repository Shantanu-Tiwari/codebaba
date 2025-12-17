"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";

import {
  BookOpen,
  Github,
  Settings,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ChevronUp,
  Moon,
  Sun,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export const AppSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const { theme, setTheme } = useTheme();

  if (isPending || !session?.user) return null;

  const user = session.user;
  const userName = user.name ?? "User";
  const userEmail = user.email ?? "";

  const navigationItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Repositories", url: "/dashboard/repository", icon: Github },
    { title: "Reviews", url: "/dashboard/reviews", icon: BookOpen },
    { title: "Subscription", url: "/dashboard/subscription", icon: CreditCard },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ];

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === url || pathname.startsWith(url + "/");
  };

  return (
    <Sidebar className="border-r border-border">
      {/* ================= Header ================= */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-full border">
              <Image
                src="/baba-logo.jpg"
                alt="Code Baba"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Code Baba
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 p-0"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      {/* ================= Navigation ================= */}
      <SidebarContent className="px-2">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <Link
                  href={item.url}
                  className={`flex items-center gap-3 ${
                    isActive(item.url)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* ================= Footer / User ================= */}
      <SidebarFooter className="border-t border-border px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-foreground">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={userName}
                    fill
                    sizes="32px"
                    className="object-cover"
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
                await signOut();
                router.push("/login");
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
  );
};
