'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";

export function DashboardHeader({ user }) {
  const router = useRouter();
  const supabase = createClient();

  // Get user initials for avatar
  const getInitials = (email) => {
    if (!email) return "U";
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
        <p className="text-slate-500">Here&apos;s a summary of your documents and their compliance.</p>
      </div>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2.5 hover:bg-slate-100 rounded-xl px-3 py-2"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-xs text-slate-500">{user?.email || ''}</p>
              </div>
              <Avatar className="w-10 h-10 ring-2 ring-slate-200 ring-offset-2">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold">
                  {getInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 bg-white shadow-xl border border-slate-200">
            <DropdownMenuLabel className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-slate-200">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold">
                    {getInitials(user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-slate-900">{user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-slate-500">{user?.email || ''}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/profile')}
              className="cursor-pointer rounded-lg py-2.5"
            >
              <User className="mr-2 h-4 w-4" />
              <span className="font-medium">Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="cursor-pointer rounded-lg py-2.5"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span className="font-medium">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg py-2.5"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-medium">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}