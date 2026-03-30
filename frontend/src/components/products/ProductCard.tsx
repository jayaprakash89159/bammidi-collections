import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Minus, Heart } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace('/api', '')

interface Product {
  id: number
  name: string
  slug: string
  price: number | string
  mrp: number | string
  unit?: string
  image?: string
  is_in_stock: boolean
  current_stock: number
  discount_percentage: number
  category?: { name: string; slug: string }
  brand?: string
  is_new_arrival?: boolean
}

export default function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { cart, addItem, updateItem, removeItem } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  const cartItem = cart?.items?.find((i: any) => i.product?.id === product.id)
  const quantity = cartItem?.quantity || 0

  const imageUrl = product.image
    ? (product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`)
    : null
  const hasImage = imageUrl && !imgError

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { navigate('/auth/login'); return }
    setLoading(true)
    try {
      await addItem(product.id, 1)
      toast.success(`Added to bag`)
    } catch {
      toast.error('Failed to add')
    } finally { setLoading(false) }
  }

  const handleIncrease = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!cartItem) return
    setLoading(true)
    try { await updateItem(cartItem.id, quantity + 1) } finally { setLoading(false) }
  }

  const handleDecrease = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!cartItem) return
    setLoading(true)
    try {
      if (quantity === 1) await removeItem(cartItem.id)
      else await updateItem(cartItem.id, quantity - 1)
    } finally { setLoading(false) }
  }

  return (
    <div className="group relative">
      {/* Image container — 3:4 ratio like NAP */}
      <Link to={`/products/${product.slug}`} className="block relative overflow-hidden bg-gray-50" style={{ aspectRatio: '3/4' }}>
        {hasImage ? (
          <img
            src={imageUrl as string}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
            style={{ transform: 'scale(1)' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
            <span className="text-6xl opacity-40">🥻</span>
          </div>
        )}

        {/* Badges */}
        {product.discount_percentage > 0 && (
          <span className="absolute top-3 left-3 bg-maroon-600 text-white text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase">
            -{product.discount_percentage}%
          </span>
        )}
        {product.is_new_arrival && (
          <span className="absolute top-3 right-3 bg-black text-white text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase">NEW</span>
        )}
        {!product.is_in_stock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Out of Stock</span>
          </div>
        )}

        {/* Wishlist */}
        <button
          onClick={e => { e.preventDefault(); setWishlisted(w => !w) }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
          style={product.is_new_arrival ? { display: 'none' } : {}}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-maroon-500 text-maroon-500' : 'text-gray-600'}`} />
        </button>

        {/* Quick add bar — slides up on hover */}
        {product.is_in_stock && (
          <div className="absolute bottom-0 left-0 right-0 bg-black text-white text-xs font-semibold tracking-wider uppercase py-2.5 text-center translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            {quantity > 0 ? (
              <div className="flex items-center justify-center gap-4" onClick={e => e.preventDefault()}>
                <button onClick={handleDecrease} disabled={loading} className="hover:opacity-70 transition px-2">
                  <Minus className="w-3 h-3" />
                </button>
                <span>{quantity} in bag</span>
                <button onClick={handleIncrease} disabled={loading} className="hover:opacity-70 transition px-2">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span onClick={handleAdd} className="cursor-pointer hover:opacity-80 transition">
                {loading ? 'Adding...' : 'Add to Bag'}
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Product info — editorial style */}
      <div className="mt-3 px-0.5">
        {(product.brand || product.category) && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-900 mb-0.5">
            {product.brand || product.category?.name}
          </p>
        )}
        <Link to={`/products/${product.slug}`}>
          <p className="text-[13px] text-gray-500 leading-snug line-clamp-2 hover:text-gray-900 transition-colors">
            {product.name}
          </p>
        </Link>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-sm font-semibold text-gray-900">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </span>
          {Number(product.mrp) > Number(product.price) && (
            <span className="text-xs text-gray-400 line-through">
              ₹{Number(product.mrp).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
