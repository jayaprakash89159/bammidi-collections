import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace('/api', '')

export default function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { cart, fetchCart, updateItem, removeItem, isLoading } = useCartStore()

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth/login'); return }
    fetchCart()
  }, [isAuthenticated])

  const subtotal = Number(cart?.total_price || 0)

  const getImageUrl = (img: string) => {
    if (!img) return null
    if (img.startsWith('http')) return img
    return `${API_BASE}${img}`
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-brand-500 mb-5 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6 font-display">Your Bag</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded bg-gray-100" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : !cart || !cart.items || cart.items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-4">🛍️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your bag is empty</h2>
            <p className="text-gray-500 text-sm mb-6">Add some beautiful ethnic wear to your bag!</p>
            <Link to="/products" className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 transition-colors">
              <ShoppingBag className="w-4 h-4" /> Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.items.map((item: any) => {
              const imageUrl = getImageUrl(item.product?.image)
              return (
                <div key={item.id} className="bg-white rounded-2xl p-4 flex gap-4 border border-gray-100 shadow-sm">
                  <div className="w-20 h-20 rounded-xl bg-brand-50 flex items-center justify-center overflow-hidden shrink-0">
                    {imageUrl
                      ? <img src={imageUrl} alt={item.product?.name} className="w-full h-full object-cover" />
                      : <span className="text-3xl">🥻</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{item.product?.name}</h3>
                    {item.product?.category?.name && (
                      <p className="text-xs text-brand-500 mt-0.5">{item.product.category.name}</p>
                    )}
                    <p className="text-brand-600 font-bold mt-1 text-sm">₹{Number(item.product?.price).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 bg-brand-500 rounded-xl px-2 py-1.5">
                      <button onClick={() => { if (item.quantity <= 1) removeItem(item.id); else updateItem(item.id, item.quantity - 1) }}
                        className="text-white w-5 h-5 flex items-center justify-center hover:bg-brand-600 rounded transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-white font-bold text-sm min-w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="text-white w-5 h-5 flex items-center justify-center hover:bg-brand-600 rounded transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">₹{Number(item.total_price).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )
            })}

            {/* Bill summary */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2 text-sm">
              <h3 className="font-bold text-gray-900 mb-3">Bill Details</h3>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart.total_items} items)</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Delivery fee calculated at checkout</span>
                <span className="text-brand-600 font-medium">—</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Subtotal</span>
                <span className="text-maroon-500">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button onClick={() => navigate('/checkout')}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-xl text-base transition-colors shadow-sm">
              Proceed to Checkout →
            </button>
          </div>
        )}
      </main>
    </>
  )
}
