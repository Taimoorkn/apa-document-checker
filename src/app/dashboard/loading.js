import DashboardLoadingSkeleton from '@/components/loading/DashboardLoadingSkeleton';
import Image from 'next/image';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm hidden md:flex">
        {/* Sidebar placeholder - empty skeleton */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <Image
                src="/LiloLogo.svg"
                alt="Lilo"
                width={40}
                height={40}
              />
            </div>
            <span className="text-2xl font-bold text-slate-800">Lilo</span>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 sm:p-8">
        <DashboardLoadingSkeleton message="Loading your dashboard..." />
      </div>
    </div>
  );
}
