import { KeyRound, LogIn } from 'lucide-react';

export default function ForgotPasswordSentScreen({ onBackToLogin }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4 text-center">
      <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
        <KeyRound size={32} className="text-purple-600" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Check your email</h2>
      <p className="text-gray-600 text-sm sm:text-base">
        If an account exists for that address, you will receive an email with a link to reset your password.
        The link expires after a short time; if it stops working, request a new one from the login page.
      </p>
      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
      >
        <LogIn size={20} /> Back to login
      </button>
    </div>
  );
}
