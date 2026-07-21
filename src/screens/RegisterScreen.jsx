import { AlertCircle, Loader2, UserPlus } from 'lucide-react';

export default function RegisterScreen({
  registering,
  authError,
  onRegister,
  onLogin,
  onBack,
  onValidationError,
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4 ${registering ? 'pointer-events-none opacity-80' : ''}`}>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Create Account</h2>
      {authError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2" role="alert">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>{authError}</span>
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (registering) return;
          const formData = new FormData(e.target);
          const username = formData.get('username');
          const email = formData.get('email');
          const password = formData.get('password');
          const confirmPassword = formData.get('confirmPassword');

          if (password !== confirmPassword) {
            onValidationError('Passwords do not match');
            return;
          }

          if (password.length < 6) {
            onValidationError('Password must be at least 6 characters');
            return;
          }

          if (username.length < 3) {
            onValidationError('Username must be at least 3 characters');
            return;
          }

          await onRegister(username, email, password);
        }}
        className="space-y-4"
      >
        <input
          name="username"
          type="text"
          placeholder="Username (min 3 characters)"
          required
          minLength={3}
          disabled={registering}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          disabled={registering}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 6 characters)"
          required
          minLength={6}
          disabled={registering}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
        />
        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          required
          minLength={6}
          disabled={registering}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={registering}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {registering ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Creating account…
            </>
          ) : (
            <>
              <UserPlus size={20} /> Create Account
            </>
          )}
        </button>
      </form>
      <div className="text-center">
        <p className="text-gray-600 text-sm">Already have an account?</p>
        <button
          onClick={onLogin}
          disabled={registering}
          className="text-purple-600 font-semibold hover:text-purple-700 text-sm sm:text-base mt-2 disabled:opacity-50"
        >
          Login here
        </button>
      </div>
      <button
        onClick={onBack}
        disabled={registering}
        className="w-full px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base disabled:opacity-50"
      >
        Back
      </button>
    </div>
  );
}
