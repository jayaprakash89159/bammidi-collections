import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Shield, RefreshCw, Headphones, ArrowRight, Sparkles } from 'lucide-react'
import Header from '@/components/layout/Header'
import ProductCard from '@/components/products/ProductCard'
import FloatingCart from '@/components/cart/FloatingCart'
import { productsApi } from '@/lib/api'

interface Product {
  id: number; name: string; slug: string; price: string; mrp: string
  image: string; discount_percentage: number; category: { name: string; slug: string }
  is_in_stock: boolean; is_new_arrival: boolean; brand?: string
}

const CATEGORIES = [
  { label: 'Sarees',    slug: 'sarees',    emoji: '🥻' },
  { label: 'Blouses',   slug: 'blouses',   emoji: '👗' },
  { label: 'Dresses',   slug: 'dresses',   emoji: '✨' },
  { label: 'Nightwear', slug: 'nightwear', emoji: '🌙' },
  { label: 'Lehengas',  slug: 'lehengas',  emoji: '💃' },
  { label: 'Kurtis',    slug: 'kurtis',    emoji: '🌸' },
]


const TRUST_ITEMS = [
  { icon: Truck,       title: 'Free Delivery',       desc: 'AP & TG ≥ ₹499 · Others ≥ ₹999' },
  { icon: Shield,      title: 'Authentic Products',   desc: '100% genuine ethnic wear' },
  { icon: RefreshCw,   title: 'Easy Returns',          desc: '7-day hassle-free returns' },
  { icon: Headphones,  title: '24/7 Support',          desc: 'Customer care in your language' },
]

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      productsApi.list({ is_featured: true, page_size: 8 }),
      productsApi.list({ is_new_arrival: true, page_size: 8 }),
    ]).then(([featRes, newRes]) => {
      setFeaturedProducts(featRes.data.results || featRes.data)
      setNewArrivals(newRes.data.results || newRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* FIX 5: Hero reduced — py-8 md:py-12 instead of py-16 md:py-24, h1 smaller */}
      <section className="relative bg-[#F5F0EB] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 max-w-lg">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-500 mb-3">New Season · 2025</p>
            <h1 className="font-display text-3xl md:text-5xl font-normal text-gray-900 leading-tight mb-4">
              Wear the<br />
              <span className="italic text-maroon-600">Story</span> of<br />
              Every Thread
            </h1>
            
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
              Handpicked ethnic & contemporary fashion — curated for the modern woman.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/products" className="inline-flex items-center gap-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-gray-800 transition-colors">
                Shop Now <ArrowRight size={14} />
              </Link>
              <Link to="/products?is_new_arrival=true" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-700 hover:text-gray-900 transition-colors border-b border-gray-400 pb-0.5">
                New Arrivals
              </Link>
            </div>
          </div>
          {/* Decorative motif — hidden on smaller laptops to save space */}
          <div className="hidden xl:flex flex-1 items-center justify-center">
            <div className="grid grid-cols-2 gap-3 w-64">
              {['🥻','💃','👗','🌸'].map((emoji, i) => (
                <div key={i} className={`flex items-center justify-center text-6xl rounded-2xl ${
                  ['bg-orange-100','bg-pink-100','bg-purple-100','bg-teal-100'][i]
                } aspect-square`}>
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY NAV */}
      <section className="border-y border-gray-100 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {CATEGORIES.map(cat => (
              <Link key={cat.slug} to={`/products?category=${cat.slug}`}
                className="flex flex-col items-center gap-2 py-3 group hover:opacity-80 transition-opacity">
                <span className="text-3xl">{cat.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-800 group-hover:text-brand-600 transition-colors">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      {(loading || newArrivals.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-maroon-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-maroon-500">Just In</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-normal text-gray-900">New Arrivals</h2>
            </div>
            <Link to="/products?is_new_arrival=true"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-0.5 transition-colors">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-100 w-full" style={{ aspectRatio: '3/4' }} />
                    <div className="mt-3 space-y-2">
                      <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))
              : newArrivals.slice(0, 4).map(p => <ProductCard key={p.id} product={p as any} />)
            }
          </div>
        </section>
      )}

      {/* EDITORIAL BANNER */}
      <section className="bg-maroon-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-maroon-200 mb-3">Handpicked for You</p>
          <h2 className="font-display text-3xl md:text-4xl font-normal mb-6 leading-tight">
            Discover the Art of<br />
            <span className="italic">Ethnic Elegance</span>
          </h2>
          <Link to="/products?featured=true"
            className="inline-flex items-center gap-2 border border-white text-white text-xs font-bold uppercase tracking-widest px-8 py-3 hover:bg-white hover:text-maroon-700 transition-colors">
            Explore Featured <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* FEATURED COLLECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Curated Picks</p>
            <h2 className="font-display text-3xl md:text-4xl font-normal text-gray-900">Featured Collection</h2>
          </div>
          <Link to="/products?featured=true"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-0.5 transition-colors">
            View All <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-100 w-full" style={{ aspectRatio: '3/4' }} />
                <div className="mt-3 space-y-2">
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-300">
            <p className="font-display text-2xl mb-2">Collection coming soon</p>
            <p className="text-sm">Add featured products from the admin panel</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
            {featuredProducts.map(p => <ProductCard key={p.id} product={p as any} />)}
          </div>
        )}
      </section>

      {/* TRUST STRIP */}
      <section className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {TRUST_ITEMS.map(item => (
              <div key={item.title} className="flex flex-col items-center text-center gap-3">
                <div className="w-11 h-11 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                  <item.icon size={18} className="text-brand-500" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-gray-800">
            <div>
              <img src="/logo.png" alt="Bammidi Collections" className="h-12 w-auto object-contain mb-4 brightness-200" />
              <p className="text-sm leading-relaxed">Premium ethnic & western fashion for women. Crafted with love, delivered with care.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-5">Shop</h4>
              <ul className="space-y-3 text-sm">
                {[['Sarees','sarees'],['Blouses','blouses'],['Dresses','dresses'],['Nightwear','nightwear'],['New Arrivals',null]].map(([label, slug]) => (
                  <li key={label as string}>
                    <Link to={slug ? `/products?category=${slug}` : '/products?is_new_arrival=true'}
                      className="hover:text-white transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-5">Help</h4>
              <ul className="space-y-3 text-sm">
                {['My Orders', 'Returns Policy', 'Size Guide', 'Contact Us'].map(item => (
                  <li key={item}><span className="cursor-pointer hover:text-white transition-colors">{item}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-5">Delivery</h4>
              <div className="text-sm space-y-2.5">
                <p>AP & Telangana: Free ≥ ₹499</p>
                <p>Other States: Free ≥ ₹999</p>
                <p>Below threshold: ₹199</p>
                <p className="text-gray-500 text-xs pt-1">Standard delivery: 4–5 business days</p>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-8">
            © {new Date().getFullYear()} Bammidi's Collections. All rights reserved.
          </p>
        </div>
      </footer>

      <FloatingCart />
    </div>
  )
}
