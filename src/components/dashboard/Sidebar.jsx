'use client';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid,
  FileText,
  LogOut,
  FileCheck2,
  User,
  Settings,
  ChevronDown
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
  { icon: FileText, label: "All Documents", href: "/documents" },
];

export default function Sidebar({ user, onNavigate }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleNavigation = (href) => {
    router.push(href);
    if (onNavigate) onNavigate();
  };

  // Get user initials for avatar
  const getInitials = (email) => {
    if (!email) return "U";
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const userDisplayName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm hidden md:flex">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <FileCheck2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-800">
            APA Pro
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Button
                key={index}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 h-12 text-md font-semibold ${isActive ? 'text-blue-600 bg-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                onClick={() => handleNavigation(item.href)}
              >
                <item.icon className="w-6 h-6" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* User Profile Dropdown */}
      <div className="p-4 border-t border-slate-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between h-auto p-3 hover:bg-slate-100"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                    {getInitials(user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold text-slate-800">
                    {userDisplayName}
                  </span>
                  <span className="text-xs text-slate-500 truncate max-w-[120px]">
                    {user?.email}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-slate-900">{userDisplayName}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleNavigation('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleNavigation('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}