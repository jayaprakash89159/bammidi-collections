import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import ProductCard from '@/components/products/ProductCard'
import FloatingCart from '@/components/cart/FloatingCart'
import { productsApi } from '@/lib/api'

const CATEGORIES = [
  { label: 'All', slug: '' },
  { label: 'Sarees', slug: 'sarees' },
  { label: 'Blouses', slug: 'blouses' },
  { label: 'Dresses', slug: 'dresses' },
  { label: 'Nightwear', slug: 'nightwear' },
  { label: 'Lehengas', slug: 'lehengas' },
  { label: 'Kurtis', slug: 'kurtis' },
]

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sort, setSort] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const activeCategory = searchParams.get('category') || ''
  const isNewArrival = searchParams.get('is_new_arrival') === 'true'
  const isFeatured = searchParams.get('featured') === 'true'

  const params: any = {}
  if (search) params.search = search
  if (activeCategory) params.category = activeCategory
  if (isNewArrival) params.is_new_arrival = true
  if (isFeatured) params.is_featured = true
  if (sort) params.ordering = sort

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params).then(r => r.data),
  })

  const products = data?.results ?? data ?? []

  const pageTitle = isNewArrival
    ? 'New Arrivals'
    : isFeatured
    ? 'Featured Collection'
    : activeCategory
    ? CATEGORIES.find(c => c.slug === activeCategory)?.label || activeCategory
    : 'All Products'

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Page header — NAP style */}
        <div className="border-b border-gray-200 pb-6 mb-8">
          <h1 className="font-display text-3xl font-normal text-gray-900 tracking-tight mb-1">{pageTitle}</h1>
          {!isLoading && (
            <p className="text-sm text-gray-400">{products.length} {products.length === 1 ? 'result' : 'results'}</p>
          )}
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters — desktop */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-24 space-y-8">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">Category</h3>
                <div className="space-y-2">
                  {CATEGORIES.map(cat => (
                    <Link
                      key={cat.slug}
                      to={cat.slug ? `/products?category=${cat.slug}` : '/products'}
                      className={`block text-sm py-1 transition-colors ${
                        activeCategory === cat.slug
                          ? 'text-gray-900 font-semibold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {cat.label}
                      {activeCategory === cat.slug && (
                        <span className="ml-2 inline-block w-1.5 h-1.5 bg-brand-500 rounded-full align-middle" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">Sort By</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Recommended', val: '' },
                    { label: 'Price: Low to High', val: 'price' },
                    { label: 'Price: High to Low', val: '-price' },
                    { label: 'A–Z', val: 'name' },
                    { label: 'Newest First', val: '-created_at' },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setSort(opt.val)}
                      className={`block text-sm py-1 text-left transition-colors w-full ${
                        sort === opt.val ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 bg-white"
                />
              </div>

              {/* Mobile: sort dropdown */}
              <div className="relative lg:hidden ml-auto">
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="appearance-none border border-gray-200 pl-3 pr-8 py-2 text-sm focus:outline-none bg-white text-gray-700">
                  <option value="">Sort</option>
                  <option value="price">Price ↑</option>
                  <option value="-price">Price ↓</option>
                  <option value="name">A–Z</option>
                  <option value="-created_at">Newest</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Mobile category pills */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 lg:hidden">
              {CATEGORIES.map(cat => (
                <Link key={cat.slug}
                  to={cat.slug ? `/products?category=${cat.slug}` : '/products'}
                  className={`shrink-0 px-4 py-1.5 text-xs font-medium border transition-all ${
                    activeCategory === cat.slug
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}>
                  {cat.label}
                </Link>
              ))}
            </div>

            {/* Product grid — 2/3/4 cols, NAP spacing */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
              {isLoading
                ? Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-100 w-full" style={{ aspectRatio: '3/4' }} />
                      <div className="mt-3 space-y-2">
                        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  ))
                : products.length > 0
                ? products.map((p: any) => <ProductCard key={p.id} product={p} />)
                : (
                  <div className="col-span-full text-center py-24">
                    <p className="text-2xl font-display text-gray-300 mb-3">No products found</p>
                    <p className="text-sm text-gray-400 mb-6">Try adjusting your filters or search</p>
                    <Link to="/products" className="inline-block border border-gray-900 text-gray-900 text-xs font-semibold uppercase tracking-widest px-8 py-3 hover:bg-gray-900 hover:text-white transition-colors">
                      View All
                    </Link>
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>
      <FloatingCart />
    </>
  )
}
