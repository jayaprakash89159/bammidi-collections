import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingBag, User, Search, Menu, X,
  LogOut, Package, Sparkles
} from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'

const NAV_CATEGORIES = [
  { label: 'New Arrivals', slug: 'new-arrivals', isNew: true },
  { label: 'Sarees', slug: 'sarees' },
  { label: 'Blouses', slug: 'blouses' },
  { label: 'Dresses', slug: 'dresses' },
  { label: 'Nightwear', slug: 'nightwear' },
  { label: 'Lehengas', slug: 'lehengas' },
  { label: 'Kurtis', slug: 'kurtis' },
]

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cart } = useCartStore()
  const { isAuthenticated, user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  const itemCount = cart?.total_items || 0

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setDropdownOpen(false)
  }

  return (
    // FIX 6: Removed top announcement bar entirely
    // FIX 7: Logo size increased via h-16 sm:h-20
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-sm' : ''}`}>
      {/* Main header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-20 gap-6">

            {/* Mobile menu toggle */}
            <button className="lg:hidden p-1.5 text-gray-700" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* FIX 7: Bigger logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Bammidi's Collections"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0 flex-1 justify-center">
              {NAV_CATEGORIES.map(cat => (
                <Link
                  key={cat.slug}
                  to={cat.slug === 'new-arrivals'
                    ? '/products?is_new_arrival=true'
                    : `/products?category=${cat.slug}`}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors whitespace-nowrap
                    ${cat.isNew
                      ? 'text-maroon-600 hover:text-maroon-800'
                      : 'text-gray-700 hover:text-gray-900'}`}
                >
                  {cat.label}
                </Link>
              ))}
            </nav>

            {/* Right icons */}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2.5 text-gray-700 hover:text-gray-900 transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              <Link to="/cart" className="relative p-2.5 text-gray-700 hover:text-gray-900 transition-colors" aria-label="Bag">
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 bg-gray-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="p-2.5 text-gray-700 hover:text-gray-900 transition-colors"
                    aria-label="Account"
                  >
                    <User size={20} />
                  </button>
                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-100 shadow-xl py-1 z-50">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                        </div>
                        <Link to="/orders" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Package size={15} /> My Orders
                        </Link>
                        {(user?.role === 'admin' || user?.is_staff) && (
                          <Link to="/dashboard/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <User size={15} /> Admin Panel
                          </Link>
                        )}
                        {user?.role === 'delivery_partner' && (
                          <Link to="/dashboard/delivery" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <Package size={15} /> Delivery Dashboard
                          </Link>
                        )}
                        <div className="border-t border-gray-100 mt-1">
                          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full">
                            <LogOut size={15} /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link to="/auth/login" className="hidden sm:inline-flex items-center gap-1.5 ml-1 text-xs font-semibold uppercase tracking-widest border border-gray-900 text-gray-900 px-4 py-2 hover:bg-gray-900 hover:text-white transition-colors">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <form onSubmit={handleSearch} className="flex items-center gap-3">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search sarees, dresses, kurtis..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 text-base outline-none text-gray-900 placeholder-gray-400 bg-transparent"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-2 space-y-0">
            {NAV_CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={cat.slug === 'new-arrivals'
                  ? '/products?is_new_arrival=true'
                  : `/products?category=${cat.slug}`}
                className={`flex items-center gap-2 py-3 text-sm border-b border-gray-50 font-medium
                  ${cat.isNew ? 'text-maroon-600' : 'text-gray-800'}`}
                onClick={() => setMobileOpen(false)}
              >
                {cat.isNew && <Sparkles size={12} />}
                {cat.label}
              </Link>
            ))}
            {!isAuthenticated ? (
              <div className="py-4">
                <Link to="/auth/login" className="block text-center bg-gray-900 text-white text-sm font-semibold py-3 tracking-widest uppercase hover:bg-gray-800 transition-colors">
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="py-4 space-y-2">
                <Link to="/orders" className="block py-2.5 text-sm text-gray-700" onClick={() => setMobileOpen(false)}>My Orders</Link>
                {(user?.role === 'admin' || user?.is_staff) && (
                  <Link to="/dashboard/admin" className="block py-2.5 text-sm text-gray-700" onClick={() => setMobileOpen(false)}>Admin Panel</Link>
                )}
                <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="block py-2.5 text-sm text-red-600 w-full text-left">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
