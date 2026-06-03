import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenue sur Servyou</h1>

        {user ? (
          <>
            <p className="text-gray-600 mb-6">{user.email}</p>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded text-sm transition-colors"
              >
                Se déconnecter
              </button>
            </form>
          </>
        ) : (
          <div className="flex justify-center gap-4 mt-6">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded text-sm transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-5 rounded text-sm transition-colors"
            >
              Créer un compte
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
