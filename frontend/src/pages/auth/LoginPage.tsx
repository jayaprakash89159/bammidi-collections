import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

// FIX 4: Google SSO component (UI only — hooks into Google Identity Services)
function GoogleSignInButton({ label = 'Continue with Google' }: { label?: string }) {
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleGoogleLogin = () => {
    // Google OAuth2 popup flow
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      toast.error('Google login not configured. Please use email & password.')
      return
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {/* Google G logo */}
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.8 29.3 5 24 5 12.4 5 3 14.4 3 26s9.4 21 21 21c11 0 20-8.9 20-20 0-1.3-.1-2.6-.4-3.9z"/>
        <path fill="#FF3D00" d="M6.3 15.2l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.8 29.3 5 24 5 16.4 5 9.8 9.2 6.3 15.2z"/>
        <path fill="#4CAF50" d="M24 47c5.2 0 9.9-1.8 13.5-4.7l-6.2-5.2C29.3 38.6 26.8 39.5 24 39.5c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 43 16.3 47 24 47z"/>
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C41.5 35.5 45 31.1 45 26c0-1.3-.1-2.6-.4-3.9z"/>
      </svg>
      {label}
    </button>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      login(res.data.user, res.data.access, res.data.refresh)
      toast.success(`Welcome back, ${res.data.user.first_name || 'there'}!`)
      navigate('/')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfaf7] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png" alt="Bammidi Collections" className="h-16 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-900 mt-4">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your Bammidi's account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-brand-100 p-8">
          {/* FIX 4: Google SSO button */}
          <GoogleSignInButton label="Continue with Google" />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400 font-medium">or sign in with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New to Bammidi's?{' '}
            <Link to="/auth/register" className="text-brand-500 hover:text-brand-600 font-semibold">Create Account</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          🔒 Your information is safe and secure
        </p>
      </div>
    </div>
  )
}
