import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';

// Force dynamic rendering since we use cookies for auth
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Server-side authentication check
  const user = await getServerUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-diagonal flex items-center justify-center px-4 relative overflow-hidden">
      {/* Scenery Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
          alt="Beautiful mountain landscape"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-navy-900/80" />
      </div>

      <div className="w-full max-w-2xl text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">CareFlow</h1>
        <p className="text-xl md:text-2xl text-navy-300 mb-8">
          Browser-based calling powered by Twilio Voice
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/login" className="btn-primary px-8 py-4 text-base font-semibold">
            Sign In
          </a>
          <a href="/signup" className="btn-ghost px-8 py-4 text-base font-semibold">
            Create Account
          </a>
        </div>

        <p className="mt-8 text-navy-400 text-sm">Secure. Reliable. Browser-based calling.</p>
      </div>
    </div>
  );
}
