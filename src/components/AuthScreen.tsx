import { useState } from 'react'
import { Plane } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { FirebaseError } from 'firebase/app'

function friendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return 'Já existe uma conta com esse e-mail. Tente entrar.'
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'E-mail ou senha incorretos.'
      case 'auth/weak-password':
        return 'A senha precisa ter pelo menos 6 caracteres.'
      case 'auth/invalid-email':
        return 'E-mail inválido.'
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return ''
      case 'auth/popup-blocked':
        return 'O navegador bloqueou a janela de login do Google. Permita pop-ups e tente de novo.'
      case 'auth/unauthorized-domain':
        return 'Este site ainda não está autorizado no Firebase para login com Google.'
      default:
        return 'Não foi possível autenticar agora. Tente novamente.'
    }
  }
  return 'Não foi possível autenticar agora. Tente novamente.'
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password)
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 pb-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-blue-600 p-2.5 text-white">
          <Plane size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Minhas Viagens
          </h1>
          <p className="text-sm text-neutral-500">Despesas e divisão de contas</p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
        <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-700 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 font-medium ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 font-medium ${mode === 'signup' ? 'bg-blue-600 text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
          >
            Criar conta
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
        >
          <GoogleIcon />
          {googleLoading ? 'Aguarde…' : 'Continuar com Google'}
        </button>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          ou
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            E-mail
          </label>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="voce@exemplo.com"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Pelo menos 6 caracteres"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim() || !password}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </div>
    </div>
  )
}
