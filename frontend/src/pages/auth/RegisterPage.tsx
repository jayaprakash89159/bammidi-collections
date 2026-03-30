import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

// FIX 4: Google SSO button (shared with Login)
function GoogleSignInButton({ label = 'Continue with Google' }: { label?: string }) {
  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      alert('Google login not configured. Please use email & password.')
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
    <button type="button" onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
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

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', password_confirm: ''
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.password_confirm) {
      toast.error('Passwords do not match'); return
    }
    setLoading(true)
    try {
      const res = await authApi.register(form)
      const { user, access, refresh } = res.data
      login(user, access, refresh)
      toast.success("Account created! Welcome to Bammidi's 🥻")
      navigate('/')
    } catch (err: any) {
      const errors = err?.response?.data
      const msg = errors?.email?.[0] || errors?.password?.[0] || errors?.detail || 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfaf7] ethnic-pattern flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png" alt="Bammidi Collections" className="h-16 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-900 mt-4">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join Bammidi's Collections today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-brand-100 p-8">
          <GoogleSignInButton label="Sign up with Google" />
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400 font-medium">or register with email</span></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <input name="first_name" required value={form.first_name} onChange={handleChange}
                  placeholder="First name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input name="last_name" required value={form.last_name} onChange={handleChange}
                  placeholder="Last name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange}
                placeholder="you@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                placeholder="+91 9999999999"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input name="password" type={showPwd ? 'text' : 'password'} required value={form.password} onChange={handleChange}
                  placeholder="Min 8 characters"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input name="password_confirm" type="password" required value={form.password_confirm} onChange={handleChange}
                placeholder="Repeat password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-brand-500 hover:text-brand-600 font-semibold">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
