'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/dashboard/Sidebar';
import MobileSidebar from '@/components/dashboard/MobileSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Calendar, ArrowLeft } from 'lucide-react';

export default function ProfileClient({ user }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const getInitials = (email) => {
    if (!email) return "U";
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleUpdateEmail = async () => {
    toast({
      title: "Feature coming soon",
      description: "Email update functionality will be available in a future update.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar user={user} />
      <MobileSidebar user={user} />

      <div className="flex-1 p-6 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
              <p className="text-slate-500">Manage your account information</p>
            </div>
          </div>

          {/* Profile Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-semibold">
                    {getInitials(user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-slate-900">
                    {user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-sm text-slate-500">APA Pro User</p>
                </div>
              </div>

              <Separator />

              {/* Account Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">Email Address</p>
                    <p className="text-sm text-slate-900">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">User ID</p>
                    <p className="text-sm text-slate-900 font-mono">{user?.id?.slice(0, 8)}...</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">Member Since</p>
                    <p className="text-sm text-slate-900">
                      {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Update Card */}
          <Card>
            <CardHeader>
              <CardTitle>Update Email</CardTitle>
              <CardDescription>Change your account email address</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Current Email
                  </label>
                  <Input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    New Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter new email address"
                    disabled
                  />
                </div>
                <Button onClick={handleUpdateEmail} disabled>
                  Update Email
                </Button>
                <p className="text-xs text-slate-500">
                  Email update functionality coming soon
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => {
                  toast({
                    variant: "destructive",
                    title: "Feature coming soon",
                    description: "Account deletion will be available in a future update.",
                  });
                }}
              >
                Delete Account
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                This action cannot be undone and will permanently delete your account and all associated data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
