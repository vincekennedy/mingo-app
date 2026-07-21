import { KeyRound } from 'lucide-react';

export default function ResetPasswordScreen({ currentUser, onSubmit, onCancel }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Choose a new password</h2>
      {currentUser?.email && (
        <p className="text-center text-sm text-gray-600">
          Signed in as <span className="font-semibold text-gray-800">{currentUser.email}</span>
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const password = formData.get('password');
          const confirmPassword = formData.get('confirmPassword');
          if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
          }
          if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
          }
          try {
            await onSubmit(password);
          } catch (error) {
            alert(error.message || 'Could not update password. Please try again.');
          }
        }}
        className="space-y-4"
      >
        <input
          name="password"
          type="password"
          placeholder="New password (min 6 characters)"
          required
          minLength={6}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
        />
        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          required
          minLength={6}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
        />
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
        >
          <KeyRound size={20} /> Update password
        </button>
      </form>
      <button
        type="button"
        onClick={onCancel}
        className="w-full px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
      >
        Cancel
      </button>
    </div>
  );
}
