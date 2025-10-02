'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function DashboardHeader({ user }) {
  // Get user initials for avatar
  const getInitials = (email) => {
    if (!email) return "U";
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
        <p className="text-slate-500">Here&apos;s a summary of your documents and their compliance.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-800">{user?.email?.split('@')[0] || 'User'}</p>
          <p className="text-xs text-slate-500">{user?.email || ''}</p>
        </div>
        <Avatar className="w-12 h-12">
          <AvatarFallback className="text-lg bg-blue-100 text-blue-600 font-semibold">{getInitials(user?.email)}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}