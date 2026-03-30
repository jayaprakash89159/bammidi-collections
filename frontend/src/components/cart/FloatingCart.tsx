import { useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'

export default function FloatingCart() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { cart, totalItems } = useCartStore()

  if (!isAuthenticated || !cart || totalItems === 0) return null

  return (
    <button
      onClick={() => navigate('/cart')}
      className="fixed bottom-6 right-6 z-50 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 transition-colors"
    >
      <ShoppingBag className="w-5 h-5" />
      <span className="font-bold">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
      <span className="text-white/60">•</span>
      <span className="font-bold">₹{Number(cart.total_price).toLocaleString('en-IN')}</span>
    </button>
  )
}
