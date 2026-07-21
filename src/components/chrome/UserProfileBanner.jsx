import { User } from 'lucide-react';

export default function UserProfileBanner({ username, onOpenDashboard }) {
  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-20">
      <button
        onClick={onOpenDashboard}
        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <User size={16} className="text-white sm:w-5 sm:h-5" />
        </div>
        <span className="text-sm sm:text-base font-semibold text-gray-800 max-w-[100px] sm:max-w-[150px] truncate">
          {username}
        </span>
      </button>
    </div>
  );
}
