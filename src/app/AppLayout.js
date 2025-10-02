'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AppLayout({ children }) {
  const pathname = usePathname();

  // Only show marketing Header/Footer on landing page
  // Exclude: dashboard, document viewer, login, signup, editor
  const showHeaderFooter = pathname === '/';

  return (
    <div className="flex flex-col min-h-screen">
      {showHeaderFooter && <Header />}
      <main className="flex-grow">
        {children}
      </main>
      {showHeaderFooter && <Footer />}
    </div>
  );
}
