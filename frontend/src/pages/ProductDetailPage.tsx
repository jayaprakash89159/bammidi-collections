import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, Minus, ShoppingBag, Tag, Package,
  TruckIcon, Shield, RefreshCw, ChevronRight, ChevronLeft,
  Shirt, Palette, Sparkles, Heart, AlertCircle
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { productsApi } from '@/lib/api'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace('/api', '')

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { cart, addItem, updateItem, removeItem } = useCartStore()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [addLoading, setAddLoading] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  // FIX 3: Size selection state
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState(false)

  useEffect(() => {
    if (!slug) return
    productsApi.detail(slug)
      .then(r => { setProduct(r.data); setLoading(false) })
      .catch(() => { setLoading(false); navigate('/products') })
  }, [slug])

  const getImageUrl = (img: string) => {
    if (!img) return null
    if (img.startsWith('http')) return img
    return `${API_BASE}${img}`
  }

  const allImages = product ? [
    product.image,
    ...(Array.isArray(product.additional_images) ? product.additional_images : []),
  ].filter(Boolean).map(getImageUrl).filter(Boolean) : []

  const cartItem = cart?.items?.find((i: any) => i.product?.id === product?.id)
  const cartQty = cartItem?.quantity || 0

  const hasSizes = product?.available_sizes?.length > 0

  // FIX 3: Validate size before adding to cart
  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/auth/login'); return }
    if (hasSizes && !selectedSize) {
      setSizeError(true)
      toast.error('Please select a size first')
      return
    }
    setSizeError(false)
    setAddLoading(true)
    try {
      await addItem(product.id, qty)
      toast.success(`${product.name}${selectedSize ? ` (${selectedSize})` : ''} added to bag!`)
    } catch { toast.error('Failed to add to bag') }
    finally { setAddLoading(false) }
  }

  const handleIncrease = async () => {
    if (!cartItem) return
    setAddLoading(true)
    try { await updateItem(cartItem.id, cartQty + 1) } finally { setAddLoading(false) }
  }

  const handleDecrease = async () => {
    if (!cartItem) return
    setAddLoading(true)
    try {
      if (cartQty === 1) await removeItem(cartItem.id)
      else await updateItem(cartItem.id, cartQty - 1)
    } finally { setAddLoading(false) }
  }

  if (loading) return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="aspect-square rounded-3xl bg-gray-100" />
            <div className="flex gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 flex-1 rounded-xl bg-gray-100" />)}</div>
          </div>
          <div className="space-y-4 pt-4">
            <div className="h-8 w-2/3 bg-gray-100 rounded-xl" />
            <div className="h-4 w-1/3 bg-gray-100 rounded" />
            <div className="h-12 w-1/2 bg-gray-100 rounded-xl" />
            <div className="h-32 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </div>
    </>
  )

  if (!product) return null

  const hasDiscount = Number(product.mrp) > Number(product.price)

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-32">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-5">
          <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/products" className="hover:text-brand-500 transition-colors">Products</Link>
          {product.category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link to={`/products?category=${product.category.slug}`} className="hover:text-brand-500 transition-colors">
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600 truncate max-w-40">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-brand-50 to-amber-50 shadow-sm group">
              {allImages.length > 0 ? (
                <img src={allImages[selectedImage] as string} alt={product.name}
                  className="w-full h-full object-cover transition-all duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🥻</div>
              )}

              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-maroon-500 text-white text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg">
                  {product.discount_percentage}% OFF
                </div>
              )}
              {product.is_new_arrival && (
                <div className="absolute top-4 right-14 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow">NEW</div>
              )}

              <button onClick={() => setWishlisted(!wishlisted)}
                className="absolute top-4 right-4 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>

              {!product.is_in_stock && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <span className="bg-gray-800 text-white font-semibold text-lg px-6 py-2.5 rounded-full">Out of Stock</span>
                </div>
              )}

              {allImages.length > 1 && (
                <>
                  <button onClick={() => setSelectedImage(i => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedImage(i => (i + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allImages.map((_, i) => (
                      <button key={i} onClick={() => setSelectedImage(i)}
                        className={`rounded-full transition-all ${i === selectedImage ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/60'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      i === selectedImage ? 'border-brand-500 shadow-md' : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}>
                    <img src={img as string} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-5">
            {product.category && (
              <Link to={`/products?category=${product.category.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors">
                <Tag className="w-3 h-3" /> {product.category.name}
              </Link>
            )}

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight font-display">{product.name}</h1>
              {product.brand && <p className="text-gray-400 text-sm mt-1">by {product.brand}</p>}
            </div>

            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-gray-900">₹{Number(product.price).toLocaleString('en-IN')}</span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through mb-0.5">₹{Number(product.mrp).toLocaleString('en-IN')}</span>
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg mb-0.5">
                    Save ₹{(Number(product.mrp) - Number(product.price)).toFixed(0)}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className={`text-sm font-medium ${product.is_in_stock ? 'text-green-600' : 'text-red-600'}`}>
                {product.is_in_stock
                  ? product.current_stock <= 10 ? `⚡ Only ${product.current_stock} left!` : 'In Stock'
                  : 'Out of Stock'}
              </span>
            </div>

            {(product.fabric || product.color || product.occasion) && (
              <div className="grid grid-cols-3 gap-3">
                {product.fabric && (
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <Shirt className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Fabric</p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{product.fabric}</p>
                  </div>
                )}
                {product.color && (
                  <div className="bg-pink-50 rounded-xl p-3 text-center">
                    <Palette className="w-4 h-4 text-pink-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Color</p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{product.color}</p>
                  </div>
                )}
                {product.occasion && (
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <Sparkles className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Occasion</p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{product.occasion}</p>
                  </div>
                )}
              </div>
            )}

            {/* FIX 3: Size selector — clickable, required before add to cart */}
            {hasSizes && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Select Size <span className="text-red-500">*</span>
                  </p>
                  {selectedSize && (
                    <span className="text-xs text-brand-600 font-medium">Selected: {selectedSize}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.available_sizes.map((size: string) => (
                    <button
                      key={size}
                      onClick={() => { setSelectedSize(size); setSizeError(false) }}
                      className={`px-4 py-2 border-2 rounded-lg text-sm font-semibold transition-all ${
                        selectedSize === size
                          ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                          : sizeError
                            ? 'border-red-300 bg-red-50 text-gray-700 hover:border-brand-400'
                            : 'border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {sizeError && (
                  <div className="flex items-center gap-1.5 mt-2 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <p className="text-xs font-medium">Please select a size to continue</p>
                  </div>
                )}
              </div>
            )}

            {product.description && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-2">About this product</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {product.care_instructions && (
              <div className="bg-blue-50 rounded-2xl p-4">
                <h3 className="font-semibold text-blue-800 text-sm mb-1">Care Instructions</h3>
                <p className="text-blue-700 text-sm">{product.care_instructions}</p>
              </div>
            )}

            {product.is_in_stock && (
              <div className="space-y-3 pt-2">
                {cartQty === 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2.5">
                      <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-200"><Minus className="w-4 h-4" /></button>
                      <span className="font-bold text-gray-900 w-6 text-center">{qty}</span>
                      <button onClick={() => setQty(Math.min(product.current_stock, qty + 1))} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
                    </div>
                    <button onClick={handleAddToCart} disabled={addLoading}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-sm">
                      <ShoppingBag className="w-5 h-5" />
                      {addLoading ? 'Adding...' : 'Add to Bag'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-brand-500 rounded-xl px-4 py-3 shadow">
                      <button onClick={handleDecrease} disabled={addLoading} className="text-white hover:bg-brand-600 w-7 h-7 flex items-center justify-center rounded-lg"><Minus className="w-4 h-4" /></button>
                      <span className="text-white font-bold text-lg w-6 text-center">{cartQty}</span>
                      <button onClick={handleIncrease} disabled={addLoading} className="text-white hover:bg-brand-600 w-7 h-7 flex items-center justify-center rounded-lg"><Plus className="w-4 h-4" /></button>
                    </div>
                    <Link to="/cart" className="flex-1 border-2 border-brand-500 text-brand-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-50 transition-colors">
                      <ShoppingBag className="w-5 h-5" /> View Bag
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
              {[
                { icon: TruckIcon, title: '4–5 Day Delivery', sub: 'Standard shipping' },
                { icon: Shield, title: 'Authentic', sub: '100% genuine' },
                { icon: RefreshCw, title: 'Easy Returns', sub: '7-day policy' },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-2xl">
                  <Icon className="w-5 h-5 text-brand-500 mb-1" />
                  <p className="text-xs font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {product.is_in_stock && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-xl z-40 md:hidden">
          <div className="max-w-lg mx-auto">
            {cartQty === 0 ? (
              <button onClick={handleAddToCart} disabled={addLoading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                <ShoppingBag className="w-5 h-5" />
                {addLoading ? 'Adding...' : hasSizes && !selectedSize ? 'Select a Size Above' : `Add to Bag • ₹${Number(product.price).toLocaleString('en-IN')}`}
              </button>
            ) : (
              <div className="flex gap-3">
                <div className="flex items-center gap-3 bg-brand-500 rounded-xl px-4 py-3">
                  <button onClick={handleDecrease} className="text-white"><Minus className="w-4 h-4" /></button>
                  <span className="text-white font-bold text-lg w-6 text-center">{cartQty}</span>
                  <button onClick={handleIncrease} className="text-white"><Plus className="w-4 h-4" /></button>
                </div>
                <Link to="/cart" className="flex-1 bg-gray-900 text-white font-semibold py-3 rounded-xl flex items-center justify-center">Go to Bag →</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
