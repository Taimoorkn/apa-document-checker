'use client';

import { Button } from "@/components/ui/button";
import {
  House,
  UserCircle,
  Gear,
  SignOut
} from "@phosphor-icons/react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

const navItems = [
  { icon: House, label: "Dashboard", href: "/dashboard" },
  { icon: UserCircle, label: "Profile", href: "/profile" },
  { icon: Gear, label: "Settings", href: "/settings" },
];

export default function Sidebar({ user, profile, onNavigate }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleNavigation = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm hidden md:flex">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <Image
              src="/LiloLogo.svg"
              alt="Lilo"
              width={40}
              height={40}
              className="w-full h-full"
            />
          </div>
          <span className="text-2xl font-bold text-slate-800">
            Lilo
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={index} href={item.href} onClick={handleNavigation} className="block">
                <div
                  className={`w-full flex items-center justify-start gap-3 h-12  px-3 rounded-lg transition-all duration-200 ${isActive
                      ? 'text-blue-700 bg-blue-50 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <Icon className="w-5 h-5" weight={isActive ? "fill" : "regular"} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-slate-200">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <SignOut className="w-5 h-5" weight="regular" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}