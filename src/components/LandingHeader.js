"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight, LayoutDashboard, LogOut, User, Settings, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const getInitials = (email) => {
    if (!email) return "U";
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/98 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-200'
          : 'bg-white/70 backdrop-blur-md border-b border-slate-100/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-[72px] flex items-center justify-between">
          {/* Logo with Badge */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Image
                  src="/LiloLogo.svg"
                  alt="Lilo"
                  width={48}
                  height={48}
                  className="w-full h-full"
                />
              </div>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                Lilo
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/#features"
              className="px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all duration-200 font-medium text-sm relative group"
            >
              Features
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:w-8 transition-all duration-300"></span>
            </Link>
            <Link
              href="/#how-it-works"
              className="px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all duration-200 font-medium text-sm relative group"
            >
              How it Works
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:w-10 transition-all duration-300"></span>
            </Link>
          </nav>

          {/* Auth Buttons / User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2.5 hover:bg-slate-100 rounded-xl pl-2 pr-3"
                    >
                      <Avatar className="w-8 h-8 ring-2 ring-slate-200 ring-offset-2">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold">
                          {getInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-slate-800 text-sm">{user.email?.split('@')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2">
                    <DropdownMenuLabel className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 ring-2 ring-slate-200">
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold">
                            {getInitials(user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-slate-900">{user.email?.split('@')[0]}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
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
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl px-4"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all font-semibold rounded-xl px-5 group"
                  >
                    <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                    Get Started
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative rounded-xl hover:bg-slate-100"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-6 w-6 text-slate-800" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="h-6 w-6 text-slate-800" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-gradient-to-b from-white to-slate-50 border-t border-slate-200 shadow-2xl"
          >
            <div className="px-4 pt-4 pb-6 space-y-3">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Link
                  href="/#features"
                  className="block px-4 py-3.5 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600 font-semibold transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </Link>
              </motion.div>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <Link
                  href="/#how-it-works"
                  className="block px-4 py-3.5 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600 font-semibold transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  How it Works
                </Link>
              </motion.div>

              {user ? (
                <>
                  <div className="h-px bg-slate-200 my-3"></div>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 font-semibold transition-all shadow-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      Dashboard
                    </Link>
                  </motion.div>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-700 hover:bg-white font-semibold transition-all border border-transparent hover:border-slate-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Link>
                  </motion.div>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-600 hover:bg-red-50 font-semibold transition-all border border-transparent hover:border-red-200"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              ) : (
                <>
                  <div className="h-px bg-slate-200 my-3"></div>
                  <div className="space-y-2">
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Link
                        href="/login"
                        className="block px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-center transition-all shadow-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.25 }}
                    >
                      <Link
                        href="/signup"
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-center shadow-lg hover:shadow-xl transition-all"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Sparkles className="h-4 w-4" />
                        Get Started
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </motion.div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
