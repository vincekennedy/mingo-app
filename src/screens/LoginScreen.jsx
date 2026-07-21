import { AlertCircle, Loader2, LogIn } from 'lucide-react';

export default function LoginScreen({
  loggingIn,
  authError,
  onLogin,
  onForgotPassword,
  onRegister,
  onBack,
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4 ${loggingIn ? 'pointer-events-none opacity-80' : ''}`}>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Login</h2>
      {authError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2" role="alert">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>{authError}</span>
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (loggingIn) return;
          const formData = new FormData(e.target);
          await onLogin(formData.get('email'), formData.get('password'));
        }}
        className="space-y-4"
      >
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          disabled={loggingIn}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          disabled={loggingIn}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={loggingIn}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loggingIn ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Signing in…
            </>
          ) : (
            <>
              <LogIn size={20} /> Login
            </>
          )}
        </button>
      </form>
      <div className="text-center">
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={loggingIn}
          className="text-sm text-purple-600 font-semibold hover:text-purple-700 disabled:opacity-50"
        >
          Forgot your password?
        </button>
      </div>
      <div className="text-center">
        <p className="text-gray-600 text-sm">Don't have an account?</p>
        <button
          onClick={onRegister}
          disabled={loggingIn}
          className="text-purple-600 font-semibold hover:text-purple-700 text-sm sm:text-base mt-2 disabled:opacity-50"
        >
          Register here
        </button>
      </div>
      <button
        onClick={onBack}
        disabled={loggingIn}
        className="w-full px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base disabled:opacity-50"
      >
        Back
      </button>
    </div>
  );
}
