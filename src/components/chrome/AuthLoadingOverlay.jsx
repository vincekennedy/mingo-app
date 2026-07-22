import { Loader2 } from 'lucide-react';

export default function AuthLoadingOverlay({ authReady, registering }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="auth-loading-title"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full mingo-orb-a mingo-generate-orb" />
        <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full mingo-orb-b mingo-generate-orb" style={{ animationDelay: '0.7s' }} />

        <div className="relative p-6 sm:p-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl mingo-sparkle shadow-lg">
            <Loader2 size={36} className="text-white animate-spin" />
          </div>

          <h2 id="auth-loading-title" className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            {!authReady
              ? 'Loading'
              : registering
                ? 'Creating your account'
                : 'Signing you in'}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {!authReady
              ? 'Checking your session…'
              : registering
                ? 'Setting things up — you’ll be in the dashboard in a moment.'
                : 'Hang tight — loading your games next.'}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full mingo-dot-a animate-pulse" />
            <span className="h-2.5 w-2.5 rounded-full mingo-dot-b animate-pulse" style={{ animationDelay: '0.2s' }} />
            <span className="h-2.5 w-2.5 rounded-full mingo-dot-c animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
