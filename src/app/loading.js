import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Image
            src="/LiloLogo.svg"
            alt="Lilo"
            width={80}
            height={80}
            className="animate-pulse"
          />
        </div>
        <div className="flex items-center gap-3 text-slate-700">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-lg font-semibold">Loading...</p>
        </div>
      </div>
    </div>
  );
}
