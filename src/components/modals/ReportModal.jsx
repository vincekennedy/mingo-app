import { AlertCircle, Check, Loader2, MessageSquarePlus, X } from 'lucide-react';
import { FEEDBACK_CATEGORIES } from '../../services/feedback';
import { getVersion } from '../../lib/version';

export default function ReportModal({
  screen,
  gameCode,
  reportCategory,
  setReportCategory,
  reportEmail,
  setReportEmail,
  reportSubject,
  setReportSubject,
  reportDetails,
  setReportDetails,
  reportSubmitting,
  reportError,
  reportSuccess,
  onSubmit,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="report-modal-title" className="text-xl sm:text-2xl font-bold text-gray-800">
              Report an issue
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Bugs, ideas, and feedback — we’ll follow up by email.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={reportSubmitting}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {reportSuccess ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <Check size={28} className="text-green-600" />
            </div>
            <p className="text-gray-800 font-semibold">Thanks — we got your report.</p>
            <p className="text-sm text-gray-600">We’ll follow up at the email you provided if we need more detail.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {reportError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2" role="alert">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{reportError}</span>
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Category</label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                disabled={reportSubmitting}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
              >
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Email</label>
              <input
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={reportSubmitting}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Subject</label>
              <input
                type="text"
                value={reportSubject}
                onChange={(e) => setReportSubject(e.target.value)}
                placeholder="Short summary"
                required
                maxLength={120}
                disabled={reportSubmitting}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Details</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="What happened, or what would you like improved?"
                required
                rows={5}
                disabled={reportSubmitting}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base resize-y disabled:bg-gray-100"
              />
            </div>

            <p className="text-xs text-gray-400">
              Includes app version v{getVersion()}
              {screen ? ` · screen: ${screen}` : ''}
              {gameCode ? ` · game: ${gameCode}` : ''}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={reportSubmitting}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reportSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-60"
              >
                {reportSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <MessageSquarePlus size={18} /> Submit
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
