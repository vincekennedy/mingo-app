import { KeyRound } from 'lucide-react';
import { authService } from '../services/auth';

export default function ForgotPasswordScreen({ onSent, onBack, showToast }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Reset password</h2>
      <p className="text-gray-600 text-sm sm:text-base text-center">
        Enter the email for your account. We will send you a link to choose a new password.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const email = formData.get('email');
          try {
            await authService.requestPasswordReset(email);
            onSent();
          } catch (error) {
            showToast(error.message || 'Could not send reset email. Please try again.');
          }
        }}
        className="space-y-4"
      >
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
        />
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
        >
          <KeyRound size={20} /> Send reset link
        </button>
      </form>
      <button
        type="button"
        onClick={onBack}
        className="w-full px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
      >
        Back to login
      </button>
    </div>
  );
}
