import { MessageSquarePlus } from 'lucide-react';

export default function ReportButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/90 backdrop-blur-sm text-gray-800 text-sm font-semibold rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200"
    >
      <MessageSquarePlus size={16} className="text-purple-600" />
      Report
    </button>
  );
}
