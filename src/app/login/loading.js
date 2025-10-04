import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/LiloLogo.svg"
            alt="Lilo"
            width={48}
            height={48}
          />
          <h1 className="text-3xl font-bold text-slate-900">Lilo</h1>
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm font-medium">Loading sign in...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
