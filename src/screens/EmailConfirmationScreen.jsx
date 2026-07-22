import { Check, LogIn } from 'lucide-react';

export default function EmailConfirmationScreen({ email, onGoToLogin, onBackHome }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4 text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Check Your Email</h2>
        <p className="text-gray-600 text-sm sm:text-base">
          We've sent a confirmation email to
        </p>
        <p className="mingo-text-brand font-semibold text-base sm:text-lg mt-1">
          {email || 'your email address'}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-700 mb-2">
          <strong>Next steps:</strong>
        </p>
        <ol className="text-sm text-gray-600 text-left space-y-1 list-decimal list-inside">
          <li>Check your email inbox (and spam folder)</li>
          <li>Click the confirmation link in the email</li>
          <li>Return here and log in with your account</li>
        </ol>
      </div>

      <div className="space-y-3">
        <button
          onClick={onGoToLogin}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 mingo-btn-primary font-bold text-base sm:text-lg rounded-xl transition shadow-lg"
        >
          <LogIn size={20} /> Go to Login
        </button>
        <button
          onClick={onBackHome}
          className="w-full px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
