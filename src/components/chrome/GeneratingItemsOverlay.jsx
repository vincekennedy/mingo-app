import { Sparkles } from 'lucide-react';

export default function GeneratingItemsOverlay({ generateStatusIndex, generateLoadingMessages }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="generate-items-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full mingo-orb-a mingo-generate-orb" />
        <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full mingo-orb-b mingo-generate-orb" style={{ animationDelay: '0.7s' }} />
        <div className="absolute top-10 left-8 h-24 w-24 rounded-full mingo-orb-c mingo-generate-orb" style={{ animationDelay: '1.2s' }} />

        <div className="relative p-6 sm:p-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl mingo-sparkle shadow-lg mingo-generate-sparkle">
            <Sparkles size={36} className="text-white" />
          </div>

          <h2 id="generate-items-title" className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Cooking up bingo squares
          </h2>
          <p
            key={generateStatusIndex}
            className="mingo-generate-copy text-sm sm:text-base text-gray-600 min-h-[3rem] flex items-center justify-center px-2"
          >
            {generateLoadingMessages[generateStatusIndex % generateLoadingMessages.length]}
          </p>

          <div className="mt-6 mx-auto grid max-w-[180px] grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="mingo-generate-tile aspect-square rounded-lg mingo-generate-tile-fill border border-white/80 shadow-sm"
                style={{ animationDelay: `${(i % 3) * 0.15 + Math.floor(i / 3) * 0.12}s` }}
              />
            ))}
          </div>

          <p className="mt-6 text-xs text-gray-400 font-medium tracking-wide uppercase">
            Hang tight — you can edit everything after
          </p>
        </div>
      </div>
    </div>
  );
}
