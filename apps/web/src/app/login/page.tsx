import { LoginButton } from './LoginButton';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-theme-surface rounded-2xl shadow-xl p-10 w-full max-w-md text-center space-y-8">
        <div>
          <div className="text-5xl mb-4">💰</div>
          <h1 className="text-3xl font-bold text-theme-text">Budgio</h1>
          <p className="mt-2 text-theme-muted text-sm">
            Gérez le budget de votre foyer en toute simplicité
          </p>
        </div>

        <LoginButton />

        <p className="text-xs text-theme-muted opacity-70">
          En vous connectant, vous acceptez nos conditions d&apos;utilisation.
        </p>
      </div>
    </div>
  );
}
