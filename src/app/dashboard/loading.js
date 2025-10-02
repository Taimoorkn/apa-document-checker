import DashboardLoadingSkeleton from '@/components/loading/DashboardLoadingSkeleton';
import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm hidden md:flex">
        {/* Sidebar placeholder - empty skeleton */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl"></div>
            <span className="text-2xl font-bold text-slate-800">APA Pro</span>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 sm:p-8">
        <DashboardLoadingSkeleton message="Loading your dashboard..." />
      </div>
    </div>
  );
}
