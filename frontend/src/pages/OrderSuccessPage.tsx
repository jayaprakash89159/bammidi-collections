import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Truck, MapPin, ShoppingBag, Package, Clock, IndianRupee } from 'lucide-react'
import Header from '@/components/layout/Header'
import { ordersApi } from '@/lib/api'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', packed: 'Packed',
  assigned: 'Assigned', picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
}

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery', upi: 'UPI', card: 'Card', razorpay: 'Online Payment',
}

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      ordersApi.detail(Number(orderId))
        .then(r => { setOrder(r.data); setLoading(false) })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [orderId])

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-10">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="relative w-28 h-28 mx-auto mb-5">
            <div className="absolute inset-0 bg-brand-100 rounded-full animate-ping opacity-30" />
            <div className="relative w-28 h-28 bg-brand-50 rounded-full flex items-center justify-center">
              <CheckCircle className="w-14 h-14 text-brand-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed! 🎉</h1>
          <p className="text-gray-500 text-sm">
            Your order is confirmed and will arrive in <strong className="text-brand-600">10–15 minutes</strong>!
          </p>
        </div>

        {/* Order summary card */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
            <div className="h-5 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-2/3 bg-gray-100 rounded" />
          </div>
        ) : order ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Order Number</p>
                <p className="font-bold text-gray-900 text-lg">{order.order_number}</p>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                {STATUS_LABELS[order.status] || order.status_display}
              </span>
            </div>

            <div className="p-5 space-y-2 border-b border-gray-50">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="w-10 h-10 rounded-xl object-cover bg-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg">🛒</div>
                  )}
                  <span className="flex-1 text-sm text-gray-700">{item.quantity}× {item.product_name}</span>
                  <span className="text-sm font-semibold text-gray-800">₹{item.total_price}</span>
                </div>
              ))}
            </div>

            <div className="p-5 space-y-2 border-b border-gray-50">
              {order.delivery_address && (
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <span>{order.delivery_address.street}, {order.delivery_address.city} – {order.delivery_address.pincode}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4 text-brand-500" />
                <span>Estimated delivery: <strong>10–15 minutes</strong></span>
              </div>
            </div>

            <div className="p-5 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal ({order.items?.length} items)</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery fee</span>
                <span className={Number(order.delivery_fee) === 0 ? 'text-brand-600 font-semibold' : ''}>{Number(order.delivery_fee) === 0 ? 'FREE' : `₹${order.delivery_fee}`}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-50">
                <span>Total Paid</span>
                <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{order.total}</span>
              </div>
              <div className="text-xs text-gray-400 text-right pt-1">
                {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                {' · '}{order.payment_status === 'paid' ? '✅ Paid' : order.payment_status === 'pending' ? '💵 Pay on delivery' : order.payment_status}
              </div>
            </div>
          </div>
        ) : null}

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          {orderId && (
            <Link to={`/order-tracking/${orderId}`}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
              <Truck className="w-5 h-5" /> Track Your Order
            </Link>
          )}
          <Link to="/orders"
            className="w-full border-2 border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <Package className="w-5 h-5" /> All My Orders
          </Link>
          <Link to="/"
            className="w-full bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
            <ShoppingBag className="w-5 h-5" /> Continue Shopping
          </Link>
        </div>
      </main>
    </>
  )
}
