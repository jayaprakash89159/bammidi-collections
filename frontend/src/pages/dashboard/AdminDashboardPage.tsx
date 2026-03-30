import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, Truck, AlertTriangle, RefreshCw, Users, Tag,
  BarChart2, PlusCircle, Pencil, Trash2, X, Check, Search,
  Upload, TrendingUp, ShoppingCart, Box, Activity, ArrowUpRight,
  IndianRupee, ToggleLeft, ToggleRight, Save, Bike, Star, UserPlus,
  Images, Sparkles, Hash, Link, FileSpreadsheet, Download,
  CheckCircle, AlertCircle, Loader2,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace('/api', '')

type Tab = 'overview' | 'orders' | 'products' | 'new_arrivals' | 'inventory' | 'users' | 'categories' | 'delivery_partners' | 'csv_upload'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-indigo-100 text-indigo-700', assigned: 'bg-purple-100 text-purple-700',
  picked_up: 'bg-orange-100 text-orange-700', out_for_delivery: 'bg-teal-100 text-teal-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
}
const STATUSES = ['pending', 'confirmed', 'assigned', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']
const BLANK_PRODUCT = {
  name: '', slug: '', price: '', mrp: '', unit: '1 pc', brand: '',
  description: '', is_active: true, is_featured: false, is_new_arrival: false,
  stock_quantity: 0, category: '', fabric: '', color: '', occasion: '',
  care_instructions: '', tags: '', available_sizes: '',
}
const autoSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function imgUrl(src: string) {
  if (!src) return ''
  if (src.startsWith('http') || src.startsWith('blob:')) return src
  return `${API_BASE}${src}`
}

// ── CSV template download ─────────────────────────────────────────────────────
const CSV_TEMPLATE_ROWS = [
  'name,category,price,mrp,brand,description,fabric,color,occasion,available_sizes,care_instructions,tags,stock_quantity,is_active,is_featured,is_new_arrival,image_url',
  'Kanjivaram Silk Saree,Sarees,4999,6999,Bammidi,Pure silk Kanjivaram saree with zari border,Silk,Red,Wedding,Free Size,Dry clean only,"silk,wedding,kanjivaram",25,1,1,1,',
  'Bridal Lehenga Set,Lehengas,8999,12000,Bammidi,Heavy embroidered bridal lehenga with choli and dupatta,Georgette,Red Gold,Bridal,"S, M, L, XL",Dry clean only,"bridal,lehenga,wedding",10,1,1,0,',
  'Cotton Anarkali Kurti,Kurtis,799,1199,Bammidi,Casual printed cotton Anarkali kurti,Cotton,Blue,Casual,"S, M, L, XL, XXL",Machine wash cold,"kurti,cotton,casual",50,1,0,1,',
  'Chiffon Party Dress,Dresses,1499,2199,Bammidi,Elegant chiffon dress with floral embroidery,Chiffon,Navy Blue,Party,"XS, S, M, L",Hand wash gently,"dress,party,chiffon",30,1,1,0,',
  'Satin Nightgown,Nightwear,599,899,Bammidi,Silky smooth satin nightgown,Satin,Lavender,Sleepwear,Free Size,Gentle machine wash,"nightwear,satin",40,1,0,0,',
  'Embroidered Blouse,Blouses,899,1299,Bammidi,Hand-embroidered peacock design blouse,Cotton Blend,Green Gold,Wedding,"32, 34, 36, 38, 40, 42",Dry clean preferred,"blouse,embroidered,peacock",20,1,1,0,',
]

function downloadCsvTemplate() {
  const csv = CSV_TEMPLATE_ROWS.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bammidi_products_template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({ title, value, icon: Icon, color, sub, onClick }: {
  title: string; value: any; icon: any; color: string; sub?: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl p-5 border border-gray-100 transition-shadow ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-brand-200' : 'hover:shadow-md'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-brand-600 font-medium mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}><Icon className="w-5 h-5" /></div>
      </div>
    </div>
  )
}

function ProductRow({ p, onEdit, onToggleNew, onDelete }: {
  p: any; onEdit: (p: any) => void; onToggleNew: (p: any) => void; onDelete: (id: number) => void
}) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
            {p.image ? <img src={imgUrl(p.image)} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🥻</div>}
          </div>
          <div>
            <p className="font-semibold text-sm">{p.name}</p>
            <p className="text-xs text-gray-400">{p.category?.name || '—'}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold text-sm">₹{p.price}</p>
        {Number(p.mrp) > Number(p.price) && <p className="text-xs text-gray-400 line-through">₹{p.mrp}</p>}
      </td>
      <td className="px-5 py-4">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${(p.inventory?.available_quantity || 0) > 10 ? 'bg-green-100 text-green-700' : (p.inventory?.available_quantity || 0) > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
          {p.inventory?.available_quantity ?? 0} units
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
          {p.is_new_arrival && <span className="text-xs px-2 py-1 rounded-full font-semibold bg-maroon-100 text-maroon-700">New</span>}
          {p.is_featured && <span className="text-xs px-2 py-1 rounded-full font-semibold bg-brand-100 text-brand-700">Featured</span>}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(p)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onToggleNew(p)} className={`p-1.5 rounded-lg transition-colors ${p.is_new_arrival ? 'bg-maroon-50 text-maroon-600 hover:bg-maroon-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}><Sparkles className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(p.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [deliveryPartners, setDeliveryPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [productForm, setProductForm] = useState<any>({ ...BLANK_PRODUCT })
  const [primaryImage, setPrimaryImage] = useState<File | null>(null)
  const [primaryPreview, setPrimaryPreview] = useState('')
  const [additionalImages, setAdditionalImages] = useState<File[]>([])
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([])
  const primaryRef = useRef<HTMLInputElement>(null)
  const extraRef = useRef<HTMLInputElement>(null)
  const [editInventory, setEditInventory] = useState<any>(null)
  const [editCategory, setEditCategory] = useState<any>(null)
  const [catForm, setCatForm] = useState({ name: '', slug: '', description: '' })
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [partnerForm, setPartnerForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '', vehicle_type: 'Bike', vehicle_number: '' })
  const [awbOrder, setAwbOrder] = useState<any>(null)
  const [awbForm, setAwbForm] = useState({ awb_number: '', tracking_url: '', courier_name: 'DTDC', estimated_delivery_date: '' })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState<any>(null)
  const csvRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') { navigate('/'); return }
    loadAll()
  }, [isAuthenticated])

  useEffect(() => { loadTab() }, [tab])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, o] = await Promise.all([adminApi.stats(), adminApi.orders()])
      setStats(s.data)
      setOrders(o.data.results ?? o.data)
    } catch (e: any) {
      toast.error('Failed to load: ' + (e?.response?.data?.detail || e?.message || 'Check backend connection'))
    }
    setLoading(false)
  }

  const loadTab = async () => {
    setLoading(true)
    try {
      if (['products', 'overview', 'new_arrivals'].includes(tab)) {
        const r = await adminApi.allProducts(); setProducts(r.data.results ?? r.data)
      }
      if (tab === 'inventory') { const r = await adminApi.inventory(); setInventory(r.data.results ?? r.data) }
      if (tab === 'users') { const r = await adminApi.users(); setUsers(r.data.results ?? r.data) }
      if (tab === 'categories') { const r = await adminApi.allCategories(); setCategories(r.data.results ?? r.data) }
      if (tab === 'delivery_partners') { const r = await adminApi.deliveryPartners(); setDeliveryPartners(r.data.results ?? r.data) }
      if (tab === 'orders') { const r = await adminApi.orders(); setOrders(r.data.results ?? r.data) }
    } catch (e: any) {
      toast.error('Load failed: ' + (e?.response?.data?.detail || e?.message || ''))
    }
    setLoading(false)
  }

  const openNewProduct = (isNewArrival = false) => {
    setEditProduct(null)
    setProductForm({ ...BLANK_PRODUCT, is_new_arrival: isNewArrival })
    setPrimaryImage(null); setPrimaryPreview(''); setAdditionalImages([]); setAdditionalPreviews([])
    setShowProductModal(true)
  }

  const openEditProduct = (p: any) => {
    setEditProduct(p)
    setProductForm({
      name: p.name, slug: p.slug, price: p.price, mrp: p.mrp,
      unit: p.unit || '1 pc', brand: p.brand || '', description: p.description || '',
      is_active: p.is_active, is_featured: p.is_featured, is_new_arrival: p.is_new_arrival || false,
      stock_quantity: p.inventory?.quantity || 0, category: p.category?.id || '',
      fabric: p.fabric || '', color: p.color || '', occasion: p.occasion || '',
      care_instructions: p.care_instructions || '', tags: p.tags || '',
      available_sizes: Array.isArray(p.available_sizes) ? p.available_sizes.join(', ') : (p.available_sizes || ''),
    })
    setPrimaryImage(null)
    setPrimaryPreview(p.image ? imgUrl(p.image) : '')
    setAdditionalImages([])
    const extras = Array.isArray(p.additional_images) ? p.additional_images.map((img: any) =>
      typeof img === 'string' ? imgUrl(img) : imgUrl(img.image || img.url || '')
    ) : []
    setAdditionalPreviews(extras)
    setShowProductModal(true)
  }

  const handleProductSave = async () => {
    if (!productForm.name || !productForm.price) { toast.error('Name and price are required'); return }
    try {
      const fd = new FormData()
      const slug = productForm.slug || autoSlug(productForm.name)
      const formFields = { ...productForm, slug }
      // Send all fields as plain strings — backend FlexibleSizesField handles available_sizes parsing
      Object.entries(formFields).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, String(v))
      })
      if (primaryImage) fd.append('image', primaryImage)
      additionalImages.forEach(img => fd.append('additional_images_upload', img))
      if (editProduct) { await adminApi.updateProduct(editProduct.id, fd); toast.success('Product updated!') }
      else { await adminApi.createProduct(fd); toast.success('Product created!') }
      setShowProductModal(false); setEditProduct(null); loadTab()
    } catch (e: any) {
      const err = e?.response?.data
      if (err && typeof err === 'object') {
        const messages = Object.entries(err).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        toast.error(messages || 'Failed to save product')
      } else {
        toast.error('Failed to save product')
      }
    }
  }

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Deactivate this product?')) return
    try { await adminApi.deleteProduct(id); toast.success('Deactivated'); loadTab() }
    catch { toast.error('Failed') }
  }

  const handleToggleNewArrival = async (p: any) => {
    try {
      const fd = new FormData(); fd.append('is_new_arrival', String(!p.is_new_arrival))
      await adminApi.updateProduct(p.id, fd)
      toast.success(p.is_new_arrival ? 'Removed from New Arrivals' : 'Added to New Arrivals ✨')
      loadTab()
    } catch { toast.error('Failed') }
  }

  const handleAddExtra = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 3 - additionalPreviews.length
    const toAdd = files.slice(0, remaining)
    if (files.length > remaining) toast.error('Max 3 extra images')
    setAdditionalImages(prev => [...prev, ...toAdd])
    setAdditionalPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removeExtra = (idx: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== idx))
    setAdditionalPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCatSave = async () => {
    if (!catForm.name) { toast.error('Name required'); return }
    try {
      const data = { ...catForm, slug: catForm.slug || autoSlug(catForm.name) }
      if (editCategory) { await adminApi.updateCategory(editCategory.id, data); toast.success('Category updated') }
      else { await adminApi.createCategory(data); toast.success('Category created') }
      setEditCategory(null); setCatForm({ name: '', slug: '', description: '' }); loadTab()
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data) || 'Failed') }
  }

  const handleInvUpdate = async (productId: number) => {
    try {
      await adminApi.updateInventory(productId, { quantity: editInventory.quantity, low_stock_threshold: editInventory.threshold })
      setEditInventory(null); toast.success('Inventory updated'); loadTab()
    } catch { toast.error('Failed') }
  }

  const handleSaveAWB = async () => {
    if (!awbForm.awb_number.trim()) { toast.error('AWB number is required'); return }
    try {
      await adminApi.updateOrderAWB(awbOrder.id, awbForm)
      toast.success('AWB saved! Customer can now track shipment.')
      setAwbOrder(null)
      setAwbForm({ awb_number: '', tracking_url: '', courier_name: 'DTDC', estimated_delivery_date: '' })
      loadTab()
    } catch {
      toast.success('AWB saved locally')
      setOrders(prev => prev.map(o => o.id === awbOrder.id ? { ...o, ...awbForm } : o))
      setAwbOrder(null)
      setAwbForm({ awb_number: '', tracking_url: '', courier_name: 'DTDC', estimated_delivery_date: '' })
    }
  }

  const handleCsvUpload = async () => {
    if (!csvFile) return
    setCsvUploading(true)
    setCsvResult(null)
    try {
      const r = await adminApi.csvUpload(csvFile)
      setCsvResult(r.data)
      if (r.data.created > 0) { loadTab(); toast.success(r.data.message) }
    } catch (e: any) {
      const errData = e?.response?.data
      setCsvResult({ error: typeof errData === 'object' ? JSON.stringify(errData) : 'Upload failed. Check CSV format.' })
      toast.error('CSV upload failed')
    } finally {
      setCsvUploading(false)
    }
  }

  const filteredOrders = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.user?.email?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
  const newArrivals = products.filter(p => p.is_new_arrival)
  const filteredNewArrivals = newArrivals.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
  const lbl = "block text-xs font-medium text-gray-600 mb-1"

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Box },
    { id: 'new_arrivals', label: 'New Arrivals', icon: Sparkles },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'users', label: 'Customers', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'delivery_partners', label: 'Delivery', icon: Bike },
    { id: 'csv_upload', label: 'CSV Upload', icon: FileSpreadsheet },
  ]

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Manage Bammidi's Collections</p>
            </div>
            <button onClick={loadAll} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium shadow-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-2xl p-1 border border-gray-100 mb-6 overflow-x-auto shadow-sm">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id as Tab)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === id ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Total Orders" value={stats.total_orders} icon={ShoppingCart} color="bg-blue-50 text-blue-600" sub={`${stats.today_orders || 0} today`} onClick={() => setTab('orders')} />
                <MetricCard title="Revenue" value={`₹${Number(stats.total_revenue || 0).toLocaleString('en-IN')}`} icon={IndianRupee} color="bg-brand-50 text-brand-600" sub={`₹${Number(stats.today_revenue || 0).toLocaleString('en-IN')} today`} />
                <MetricCard title="Customers" value={stats.total_customers} icon={Users} color="bg-purple-50 text-purple-600" sub={`${stats.new_customers_today || 0} new today`} onClick={() => setTab('users')} />
                <MetricCard title="Products" value={stats.total_products} icon={Box} color="bg-orange-50 text-orange-600" sub={`${stats.low_stock_alerts || 0} low stock`} onClick={() => setTab('products')} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Pending" value={stats.pending_orders} icon={Activity} color="bg-yellow-50 text-yellow-600" onClick={() => setTab('orders')} />
                <MetricCard title="Delivery Partners" value={`${stats.active_delivery_partners || 0}/${stats.total_delivery_partners || 0}`} icon={Truck} color="bg-teal-50 text-teal-600" onClick={() => setTab('delivery_partners')} />
                <MetricCard title="Low Stock" value={stats.low_stock_alerts} icon={AlertTriangle} color="bg-red-50 text-red-600" onClick={() => setTab('inventory')} />
                <MetricCard title="Week Revenue" value={`₹${Number(stats.week_revenue || 0).toLocaleString('en-IN')}`} icon={TrendingUp} color="bg-indigo-50 text-indigo-600" />
              </div>
              {stats.revenue_chart && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4">Revenue — Last 7 Days</h3>
                  <div className="flex items-end gap-3 h-40">
                    {stats.revenue_chart.map((d: any, i: number) => {
                      const max = Math.max(...stats.revenue_chart.map((x: any) => x.revenue)) || 1
                      const h = Math.max((d.revenue / max) * 100, 4)
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-500">₹{Number(d.revenue).toFixed(0)}</span>
                          <div className="w-full bg-brand-500 rounded-t-lg" style={{ height: `${h}%` }} />
                          <span className="text-xs text-gray-400">{new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-900">All Orders ({filteredOrders.length})</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-56" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="text-left px-5 py-3">Order</th>
                    <th className="text-left px-5 py-3">Customer</th>
                    <th className="text-left px-5 py-3">Total</th>
                    <th className="text-left px-5 py-3">Payment</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Update</th>
                    <th className="text-left px-5 py-3">Shipment</th>
                  </tr></thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-sm">{o.order_number}</p>
                          <p className="text-gray-400 text-xs">{new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-800">{o.customer_name || o.user?.first_name && `${o.user.first_name} ${o.user.last_name}`.trim() || '—'}</p>
                          <p className="text-xs text-gray-400">{o.customer_email || o.user?.email || ''}</p>
                        </td>
                        <td className="px-5 py-4 font-bold text-sm">₹{o.total}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : o.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.payment_status}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>{o.status?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-5 py-4">
                          <select value={o.status}
                            onChange={async e => {
                              try {
                                await adminApi.updateOrderStatus(o.id, e.target.value)
                                setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: e.target.value } : x))
                                toast.success('Status updated')
                              } catch { toast.error('Failed') }
                            }}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          {o.awb_number ? (
                            <div className="space-y-1">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{o.awb_number}</span>
                              <br />
                              <button onClick={() => { setAwbOrder(o); setAwbForm({ awb_number: o.awb_number || '', tracking_url: o.tracking_url || '', courier_name: o.courier_name || 'DTDC', estimated_delivery_date: o.estimated_delivery_date || '' }) }}
                                className="text-xs text-blue-600 hover:underline">Edit AWB</button>
                            </div>
                          ) : (
                            <button onClick={() => { setAwbOrder(o); setAwbForm({ awb_number: '', tracking_url: '', courier_name: 'DTDC', estimated_delivery_date: '' }) }}
                              className="flex items-center gap-1 text-xs bg-cyan-50 text-cyan-700 hover:bg-cyan-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
                              <Hash className="w-3 h-3" /> Add AWB
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">No orders found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {tab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none w-56" />
                </div>
                <button onClick={() => openNewProduct()} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                  <PlusCircle className="w-4 h-4" /> Add Product
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="text-left px-5 py-3">Product</th>
                      <th className="text-left px-5 py-3">Price</th>
                      <th className="text-left px-5 py-3">Stock</th>
                      <th className="text-left px-5 py-3">Flags</th>
                      <th className="text-left px-5 py-3">Actions</th>
                    </tr></thead>
                    <tbody>
                      {filteredProducts.map(p => <ProductRow key={p.id} p={p} onEdit={openEditProduct} onToggleNew={handleToggleNewArrival} onDelete={handleDeleteProduct} />)}
                      {filteredProducts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No products. Click "Add Product" to create one.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── NEW ARRIVALS ── */}
          {tab === 'new_arrivals' && (
            <div className="space-y-4">
              <div className="bg-maroon-50 border border-maroon-200 rounded-2xl p-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-maroon-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-maroon-800">New Arrivals</p>
                  <p className="text-xs text-maroon-600">Use the ✨ button on any product to add/remove from this section</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none w-56" />
                </div>
                <button onClick={() => openNewProduct(true)} className="flex items-center gap-2 bg-maroon-500 hover:bg-maroon-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                  <PlusCircle className="w-4 h-4" /> Add New Arrival
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="text-left px-5 py-3">Product</th><th className="text-left px-5 py-3">Price</th>
                      <th className="text-left px-5 py-3">Stock</th><th className="text-left px-5 py-3">Flags</th><th className="text-left px-5 py-3">Actions</th>
                    </tr></thead>
                    <tbody>
                      {filteredNewArrivals.map(p => <ProductRow key={p.id} p={p} onEdit={openEditProduct} onToggleNew={handleToggleNewArrival} onDelete={handleDeleteProduct} />)}
                      {filteredNewArrivals.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400"><Sparkles className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No New Arrivals yet</p></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY ── */}
          {tab === 'inventory' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b"><h2 className="font-bold text-gray-900">Inventory Management</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="text-left px-5 py-3">Product</th><th className="text-left px-5 py-3">Available</th>
                    <th className="text-left px-5 py-3">Reserved</th><th className="text-left px-5 py-3">Low Stock At</th>
                    <th className="text-left px-5 py-3">Alert</th><th className="text-left px-5 py-3">Actions</th>
                  </tr></thead>
                  <tbody>
                    {inventory.map(inv => (
                      <tr key={inv.product_id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {inv.product_image && <img src={inv.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                            <p className="font-semibold text-sm">{inv.product_name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {editInventory?.product_id === inv.product_id
                            ? <input type="number" value={editInventory.quantity} onChange={e => setEditInventory({ ...editInventory, quantity: Number(e.target.value) })} className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                            : <span className={`font-bold text-sm ${inv.available_quantity === 0 ? 'text-red-600' : inv.is_low_stock ? 'text-yellow-600' : 'text-green-600'}`}>{inv.available_quantity}</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{inv.reserved_quantity}</td>
                        <td className="px-5 py-4">
                          {editInventory?.product_id === inv.product_id
                            ? <input type="number" value={editInventory.threshold} onChange={e => setEditInventory({ ...editInventory, threshold: Number(e.target.value) })} className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                            : <span className="text-sm text-gray-500">{inv.low_stock_threshold}</span>}
                        </td>
                        <td className="px-5 py-4">
                          {inv.available_quantity === 0
                            ? <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">Out of Stock</span>
                            : inv.is_low_stock
                            ? <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Low Stock</span>
                            : <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">OK</span>}
                        </td>
                        <td className="px-5 py-4">
                          {editInventory?.product_id === inv.product_id
                            ? <div className="flex gap-2">
                                <button onClick={() => handleInvUpdate(inv.product_id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditInventory(null)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            : <button onClick={() => setEditInventory({ product_id: inv.product_id, quantity: inv.available_quantity, threshold: inv.low_stock_threshold })} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil className="w-3.5 h-3.5" /></button>}
                        </td>
                      </tr>
                    ))}
                    {inventory.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No inventory records</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CUSTOMERS ── */}
          {tab === 'users' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b">
                <h2 className="font-bold text-gray-900">Customers ({users.filter(u => u.role === 'customer' || !u.role).length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="text-left px-5 py-3">Customer</th><th className="text-left px-5 py-3">Phone</th>
                    <th className="text-left px-5 py-3">Joined</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">Action</th>
                  </tr></thead>
                  <tbody>
                    {users.filter(u => u.role === 'customer' || !u.role).map(u => (
                      <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-4"><p className="font-semibold text-sm">{u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                        <td className="px-5 py-4 text-sm text-gray-600">{u.phone || '—'}</td>
                        <td className="px-5 py-4 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button onClick={async () => {
                            try { await adminApi.updateUser(u.id, { is_active: !u.is_active }); setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x)); toast.success('Updated') }
                            catch { toast.error('Failed') }
                          }} className={`p-1.5 rounded-lg ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                            {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.role === 'customer' || !u.role).length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No customers yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CATEGORIES ── */}
          {tab === 'categories' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">{editCategory ? 'Edit Category' : 'Add New Category'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className={lbl}>Name *</label><input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value, slug: p.slug || autoSlug(e.target.value) }))} className={inp} placeholder="e.g. Sarees" /></div>
                  <div><label className={lbl}>Slug</label><input value={catForm.slug} onChange={e => setCatForm(p => ({ ...p, slug: e.target.value }))} className={inp} placeholder="auto-generated" /></div>
                  <div><label className={lbl}>Description</label><input value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} className={inp} placeholder="Optional" /></div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleCatSave} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Save className="w-4 h-4" /> {editCategory ? 'Update' : 'Create'}</button>
                  {editCategory && <button onClick={() => { setEditCategory(null); setCatForm({ name: '', slug: '', description: '' }) }} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Slug</th><th className="text-left px-5 py-3">Description</th><th className="text-left px-5 py-3">Actions</th>
                  </tr></thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-4 font-semibold text-sm">{c.name}</td>
                        <td className="px-5 py-4 text-sm text-gray-500">{c.slug}</td>
                        <td className="px-5 py-4 text-sm text-gray-500">{c.description || '—'}</td>
                        <td className="px-5 py-4"><button onClick={() => { setEditCategory(c); setCatForm({ name: c.name, slug: c.slug, description: c.description || '' }) }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                    {categories.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No categories yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── DELIVERY PARTNERS ── */}
          {tab === 'delivery_partners' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Delivery Partners ({deliveryPartners.length})</h2>
                  <button onClick={() => setShowPartnerModal(true)} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"><UserPlus className="w-4 h-4" /> Add Partner</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deliveryPartners.map(p => (
                    <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${p.is_available && p.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="font-semibold text-sm">{p.user?.full_name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.is_active ? (p.is_available ? 'Online' : 'Offline') : 'Inactive'}</span>
                      </div>
                      <p className="text-xs text-gray-500">{p.user?.phone} — {p.vehicle_type} {p.vehicle_number}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-2 mb-3">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{p.rating}</span>
                        <span>{p.total_deliveries} deliveries</span>
                      </div>
                      <button onClick={async () => {
                        try { await adminApi.updateDeliveryPartner(p.id, { is_active: !p.is_active }); toast.success('Updated'); loadTab() }
                        catch { toast.error('Failed') }
                      }} className={`w-full text-xs py-1.5 rounded-lg font-medium transition ${p.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ))}
                  {deliveryPartners.length === 0 && <div className="col-span-3 text-center py-8 text-gray-400 text-sm">No delivery partners yet.</div>}
                </div>
              </div>
            </div>
          )}

          {/* ── CSV UPLOAD ── */}
          {tab === 'csv_upload' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-50 rounded-xl"><FileSpreadsheet className="w-6 h-6 text-green-600" /></div>
                  <div className="flex-1">
                    <h2 className="font-bold text-gray-900 text-lg mb-1">Step 1 — Download Template CSV</h2>
                    <p className="text-sm text-gray-500 mb-4">Download the reference CSV, fill in your products, then upload. Add hundreds of products at once.</p>
                    <button onClick={downloadCsvTemplate} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                      <Download className="w-4 h-4" /> Download Template CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Column Reference</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="text-left px-4 py-2">Column</th>
                      <th className="text-left px-4 py-2">Required</th>
                      <th className="text-left px-4 py-2">Example</th>
                      <th className="text-left px-4 py-2">Notes</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {([
                        ['name', '✅ Yes', 'Kanjivaram Silk Saree', 'Product name'],
                        ['category', 'Recommended', 'Sarees', 'Auto-created if not exists'],
                        ['price', '✅ Yes', '4999', 'Selling price in ₹'],
                        ['mrp', 'No', '6999', 'Original price (defaults to price)'],
                        ['brand', 'No', 'Bammidi', 'Brand name'],
                        ['description', 'No', 'Pure silk saree...', 'Product description'],
                        ['fabric', 'No', 'Silk', 'Fabric type'],
                        ['color', 'No', 'Red', 'Color'],
                        ['occasion', 'No', 'Wedding', 'Occasion'],
                        ['available_sizes', 'No', 'S, M, L, XL', 'Comma-separated or Free Size'],
                        ['care_instructions', 'No', 'Dry clean only', 'Care instructions'],
                        ['tags', 'No', 'silk, wedding', 'Comma-separated tags'],
                        ['stock_quantity', 'No', '25', 'Initial stock (default 0)'],
                        ['is_active', 'No', '1', '1=active, 0=inactive (default 1)'],
                        ['is_featured', 'No', '1', '1=featured (default 0)'],
                        ['is_new_arrival', 'No', '0', '1=new arrival (default 0)'],
                        ['image_url', 'No', 'https://...', 'Public image URL — auto-downloaded'],
                      ] as [string, string, string, string][]).map(([col, req, ex, note]) => (
                        <tr key={col} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs text-blue-700">{col}</td>
                          <td className="px-4 py-2 text-xs">{req}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{ex}</td>
                          <td className="px-4 py-2 text-gray-400 text-xs">{note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-1">Step 2 — Upload Your CSV</h2>
                <p className="text-sm text-gray-500 mb-5">Select your filled CSV file. Products are created immediately.</p>

                <div
                  onClick={() => csvRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${csvFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-brand-400 hover:bg-brand-50'}`}
                >
                  {csvFile ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-10 h-10 text-green-500 mx-auto" />
                      <p className="font-semibold text-green-700">{csvFile.name}</p>
                      <p className="text-sm text-green-600">{(csvFile.size / 1024).toFixed(1)} KB · Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto" />
                      <p className="font-semibold text-gray-600">Click to select your CSV file</p>
                      <p className="text-xs text-gray-400">Only .csv files · UTF-8 encoding</p>
                    </div>
                  )}
                  <input ref={csvRef} type="file" accept=".csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setCsvFile(f); setCsvResult(null) } }} />
                </div>

                {csvFile && !csvUploading && (
                  <button onClick={handleCsvUpload}
                    className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <FileSpreadsheet className="w-4 h-4" /> Upload and Create Products
                  </button>
                )}

                {csvUploading && (
                  <div className="mt-4 flex items-center justify-center gap-3 py-6 text-brand-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Processing your CSV... please wait</span>
                  </div>
                )}

                {csvResult && !csvUploading && (
                  <div className="mt-5 space-y-3">
                    {csvResult.error ? (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-700">Upload Failed</p>
                          <p className="text-sm text-red-600 mt-0.5">{csvResult.error}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-700">{csvResult.created}</p>
                            <p className="text-xs text-green-600 font-medium mt-1">Products Created</p>
                          </div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-yellow-700">{csvResult.skipped}</p>
                            <p className="text-xs text-yellow-600 font-medium mt-1">Rows Skipped</p>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-blue-700">{csvResult.errors?.length || 0}</p>
                            <p className="text-xs text-blue-600 font-medium mt-1">Errors</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">{csvResult.message}</span>
                        </div>
                        {csvResult.errors?.length > 0 && (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Row Errors ({csvResult.errors.length})</p>
                            <ul className="space-y-1">
                              {csvResult.errors.map((err: string, i: number) => (
                                <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                                  <span className="mt-0.5">•</span><span>{err}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button onClick={() => { setCsvFile(null); setCsvResult(null); if (csvRef.current) csvRef.current.value = '' }}
                          className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                          Upload Another CSV
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── PRODUCT MODAL ── */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">{editProduct ? `Edit: ${editProduct.name}` : 'Add New Product'}</h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className={lbl}>Primary Image</label>
                <div onClick={() => primaryRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                  {primaryPreview
                    ? <img src={primaryPreview} alt="" className="h-36 mx-auto object-cover rounded-xl" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <div className="space-y-2"><Upload className="w-8 h-8 text-gray-400 mx-auto" /><p className="text-sm text-gray-500">Click to upload main image</p></div>}
                  {primaryPreview && <p className="text-xs text-gray-400 mt-2">Click to change image</p>}
                  <input ref={primaryRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPrimaryImage(f); setPrimaryPreview(URL.createObjectURL(f)) } }} />
                </div>
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Images className="w-4 h-4" /> Additional Images (up to 3)</span></label>
                <div className="flex gap-3 flex-wrap mt-2">
                  {additionalPreviews.map((pr, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200">
                      <img src={pr} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeExtra(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {additionalPreviews.length < 3 && (
                    <button onClick={() => extraRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors cursor-pointer">
                      <Upload className="w-5 h-5" /><span className="text-xs">Add</span>
                    </button>
                  )}
                  <input ref={extraRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddExtra} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lbl}>Product Name *</label><input value={productForm.name} onChange={e => setProductForm((p: any) => ({ ...p, name: e.target.value, slug: p.slug || autoSlug(e.target.value) }))} className={inp} placeholder="e.g. Kanjivaram Silk Saree" /></div>
                <div><label className={lbl}>Slug</label><input value={productForm.slug} onChange={e => setProductForm((p: any) => ({ ...p, slug: e.target.value }))} className={inp} placeholder="auto-generated" /></div>
                <div><label className={lbl}>Category</label><select value={productForm.category} onChange={e => setProductForm((p: any) => ({ ...p, category: e.target.value }))} className={inp + " bg-white"}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className={lbl}>Price (₹) *</label><input type="number" value={productForm.price} onChange={e => setProductForm((p: any) => ({ ...p, price: e.target.value }))} className={inp} placeholder="499" /></div>
                <div><label className={lbl}>MRP (₹)</label><input type="number" value={productForm.mrp} onChange={e => setProductForm((p: any) => ({ ...p, mrp: e.target.value }))} className={inp} placeholder="699" /></div>
                <div><label className={lbl}>Stock Quantity</label><input type="number" value={productForm.stock_quantity} onChange={e => setProductForm((p: any) => ({ ...p, stock_quantity: e.target.value }))} className={inp} placeholder="50" /></div>
                <div><label className={lbl}>Brand</label><input value={productForm.brand} onChange={e => setProductForm((p: any) => ({ ...p, brand: e.target.value }))} className={inp} placeholder="Brand name" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={lbl}>Fabric</label><input value={productForm.fabric} onChange={e => setProductForm((p: any) => ({ ...p, fabric: e.target.value }))} className={inp} placeholder="Silk, Cotton..." /></div>
                <div><label className={lbl}>Color</label><input value={productForm.color} onChange={e => setProductForm((p: any) => ({ ...p, color: e.target.value }))} className={inp} placeholder="Red, Blue..." /></div>
                <div><label className={lbl}>Occasion</label><input value={productForm.occasion} onChange={e => setProductForm((p: any) => ({ ...p, occasion: e.target.value }))} className={inp} placeholder="Wedding, Casual..." /></div>
              </div>
              <div>
                <label className={lbl}>Available Sizes (comma-separated)</label>
                <input value={productForm.available_sizes} onChange={e => setProductForm((p: any) => ({ ...p, available_sizes: e.target.value }))} className={inp} placeholder="S, M, L, XL — or just type: Free Size" />
                <p className="text-xs text-gray-400 mt-1">Type sizes separated by commas, e.g. S, M, L, XL — or type "Free Size"</p>
              </div>
              <div><label className={lbl}>Description</label><textarea value={productForm.description} onChange={e => setProductForm((p: any) => ({ ...p, description: e.target.value }))} rows={3} className={inp + " resize-none"} placeholder="Product description..." /></div>
              <div><label className={lbl}>Care Instructions</label><input value={productForm.care_instructions} onChange={e => setProductForm((p: any) => ({ ...p, care_instructions: e.target.value }))} className={inp} placeholder="Dry clean only..." /></div>
              <div><label className={lbl}>Tags (comma-separated)</label><input value={productForm.tags} onChange={e => setProductForm((p: any) => ({ ...p, tags: e.target.value }))} className={inp} placeholder="silk, wedding, handloom" /></div>
              <div className="flex flex-wrap gap-6 pt-1">
                {([{ k: 'is_active', l: 'Active' }, { k: 'is_featured', l: 'Featured ⭐' }, { k: 'is_new_arrival', l: 'New Arrival ✨' }] as { k: string; l: string }[]).map(({ k, l }) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!productForm[k]} onChange={e => setProductForm((p: any) => ({ ...p, [k]: e.target.checked }))} className="accent-brand-500 w-4 h-4" />
                    <span className="text-sm font-medium text-gray-700">{l}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleProductSave} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"><Save className="w-4 h-4" /> {editProduct ? 'Update Product' : 'Create Product'}</button>
                <button onClick={() => setShowProductModal(false)} className="px-6 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AWB MODAL ── */}
      {awbOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">Add Shipment Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">Order: {awbOrder.order_number}</p>
              </div>
              <button onClick={() => setAwbOrder(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3 mb-4 text-xs text-cyan-700">
              This will be visible to the customer on their tracking page with a direct courier link.
            </div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Courier Partner *</label>
                <select value={awbForm.courier_name} onChange={e => setAwbForm(p => ({ ...p, courier_name: e.target.value }))} className={inp + " bg-white"}>
                  {['DTDC', 'India Post', 'Delhivery', 'Ekart', 'BlueDart', 'FedEx', 'Xpressbees', 'Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>AWB / Tracking Number *</label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input value={awbForm.awb_number} onChange={e => setAwbForm(p => ({ ...p, awb_number: e.target.value.toUpperCase() }))}
                    className={inp + " pl-9 font-mono tracking-wider"} placeholder="e.g. D123456789" />
                </div>
              </div>
              <div>
                <label className={lbl}>Tracking URL (optional)</label>
                <div className="relative">
                  <Link className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input value={awbForm.tracking_url} onChange={e => setAwbForm(p => ({ ...p, tracking_url: e.target.value }))}
                    className={inp + " pl-9"} placeholder="https://courier.com/track/..." />
                </div>
              </div>
              <div>
                <label className={lbl}>Estimated Delivery Date (optional)</label>
                <input type="date" value={awbForm.estimated_delivery_date || ''} onChange={e => setAwbForm(p => ({ ...p, estimated_delivery_date: e.target.value }))}
                  className={inp} min={new Date().toISOString().split('T')[0]} />
                <p className="text-xs text-gray-400 mt-1">If not set, system auto-calculates based on state (AP/TG: 5 days, others: 7 days)</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={handleSaveAWB} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save and Notify Customer
              </button>
              <button onClick={() => setAwbOrder(null)} className="px-6 border border-gray-200 text-gray-600 py-3 rounded-xl hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PARTNER MODAL ── */}
      {showPartnerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Add Delivery Partner</h2>
              <button onClick={() => setShowPartnerModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {([
                { label: 'First Name', key: 'first_name', type: 'text' },
                { label: 'Last Name', key: 'last_name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Phone', key: 'phone', type: 'tel' },
                { label: 'Password', key: 'password', type: 'password' },
                { label: 'Vehicle No', key: 'vehicle_number', type: 'text' },
              ] as { label: string; key: string; type: string }[]).map(({ label, key, type }) => (
                <div key={key}>
                  <label className={lbl}>{label}</label>
                  <input type={type} value={(partnerForm as any)[key]} onChange={e => setPartnerForm(p => ({ ...p, [key]: e.target.value }))} className={inp} />
                </div>
              ))}
              <div>
                <label className={lbl}>Vehicle Type</label>
                <select value={partnerForm.vehicle_type} onChange={e => setPartnerForm(p => ({ ...p, vehicle_type: e.target.value }))} className={inp + " bg-white"}>
                  {['Bike', 'Scooter', 'Bicycle', 'Car', 'Auto'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={async () => {
                  try {
                    await adminApi.createDeliveryPartner(partnerForm)
                    toast.success('Partner created!')
                    setShowPartnerModal(false)
                    setPartnerForm({ email: '', password: '', first_name: '', last_name: '', phone: '', vehicle_type: 'Bike', vehicle_number: '' })
                    loadTab()
                  } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed') }
                }} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors">Create Partner</button>
                <button onClick={() => setShowPartnerModal(false)} className="px-6 border border-gray-200 text-gray-600 py-3 rounded-xl hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
