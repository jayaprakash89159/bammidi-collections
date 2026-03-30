import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Package, ChevronRight, Clock, CheckCircle, XCircle,
  Truck, ShoppingBag, ArrowLeft, RefreshCw, IndianRupee,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { ordersApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:          { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  confirmed:        { label: 'Confirmed',         color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: CheckCircle },
  packed:           { label: 'Packed',            color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Package },
  assigned:         { label: 'Assigned',          color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck },
  picked_up:        { label: 'Picked Up',         color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery',  color: 'bg-teal-100 text-teal-700 border-teal-200',       icon: Truck },
  delivered:        { label: 'Delivered',         color: 'bg-green-100 text-green-700 border-green-200',    icon: CheckCircle },
  cancelled:        { label: 'Cancelled',         color: 'bg-red-100 text-red-700 border-red-200',          icon: XCircle },
}

const PAYMENT_LABEL: Record<string, string> = {
  upi: 'UPI', card: 'Card', cod: 'Cash on Delivery', razorpay: 'Online',
}

const ORDER_STEPS = ['pending','confirmed','packed','picked_up','out_for_delivery','delivered']

function OrderCard({ order }: { order: any }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  const isActive = !['delivered','cancelled'].includes(order.status)
  const curStep = ORDER_STEPS.indexOf(order.status)
  const pct = Math.max(5, Math.round(((curStep + 1) / ORDER_STEPS.length) * 100))

  return (
    <Link to={`/order-tracking/${order.id}`}>
      <div className={`bg-white rounded-2xl border-2 p-4 hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-brand-100' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-gray-900 text-sm">{order.order_number}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
              <Icon className="w-3 h-3" /> {cfg.label}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="space-y-1 mb-3">
          {order.items?.slice(0, 3).map((item: any) => (
            <div key={item.id} className="flex items-center gap-2">
              {item.product_image
                ? <img src={item.product_image} alt={item.product_name} className="w-8 h-8 rounded-lg object-cover bg-gray-100" />
                : <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-base">🥻</div>}
              <span className="text-sm text-gray-600 flex-1 truncate">{item.quantity}× {item.product_name}</span>
              <span className="text-sm font-semibold text-gray-800">₹{item.total_price}</span>
            </div>
          ))}
          {(order.items?.length || 0) > 3 && (
            <p className="text-xs text-gray-400 pl-10">+{order.items.length - 3} more items</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{PAYMENT_LABEL[order.payment_method] || order.payment_method}</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              order.payment_status === 'paid' ? 'bg-green-100 text-green-700'
              : order.payment_status === 'failed' ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'}`}>
              {order.payment_status_display || order.payment_status}
            </span>
          </div>
          <div className="flex items-center gap-1 font-bold text-gray-900">
            <IndianRupee className="w-3.5 h-3.5" /><span>{order.total}</span>
          </div>
        </div>

        {isActive && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Order progress</span>
              <span className="text-xs text-brand-600 font-semibold">Tap to track →</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth/login'); return }
    load()
  }, [isAuthenticated])

  const load = async () => {
    setLoading(true)
    try {
      const res = await ordersApi.list()
      setOrders(res.data.results ?? res.data)
    } catch {}
    setLoading(false)
  }

  const activeOrders = orders.filter(o => !['delivered','cancelled'].includes(o.status))
  const pastOrders   = orders.filter(o => ['delivered','cancelled'].includes(o.status))

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
              <p className="text-sm text-gray-500">{orders.length} total orders</p>
            </div>
          </div>
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-gray-100 rounded" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
                <div className="h-8 bg-gray-50 rounded-xl" />
                <div className="h-4 w-1/2 bg-gray-50 rounded" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 text-sm mb-6">Start shopping to see your orders here</p>
            <Link to="/products" className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 transition-colors">
              <ShoppingBag className="w-4 h-4" /> Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                  Active Orders ({activeOrders.length})
                </h2>
                <div className="space-y-3">
                  {activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              </div>
            )}
            {pastOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Past Orders ({pastOrders.length})
                </h2>
                <div className="space-y-3">
                  {pastOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
