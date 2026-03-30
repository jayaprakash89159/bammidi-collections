import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Package, Truck, MapPin, Clock, ExternalLink, Calendar } from 'lucide-react'
import Header from '@/components/layout/Header'
import { ordersApi } from '@/lib/api'

// FIX 1: Amazon/Flipkart style steps — no hours/minutes delivery
const ORDER_STEPS = [
  { key: 'confirmed',  label: 'Order Confirmed',  desc: 'Your order has been placed & confirmed',    icon: CheckCircle },
  { key: 'shipped',    label: 'Shipped',           desc: 'Order handed over to courier',              icon: Package },
  { key: 'in_transit', label: 'In Transit',        desc: 'Your order is on the way to your city',     icon: Truck },
  { key: 'delivered',  label: 'Delivered',         desc: 'Successfully delivered to your address!',   icon: CheckCircle },
]

const STATUS_ORDER = ['pending','confirmed','assigned','shipped','in_transit','out_for_delivery','delivered']

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-700',
  confirmed:        'bg-blue-100 text-blue-700',
  assigned:         'bg-purple-100 text-purple-700',
  shipped:          'bg-cyan-100 text-cyan-700',
  in_transit:       'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-teal-100 text-teal-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
}

const COURIER_TRACK_URLS: Record<string, string> = {
  DTDC:        'https://www.dtdc.in/tracking/tracking_results.asp?Ttype=awb&strCNno=',
  'India Post': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?',
  Delhivery:   'https://www.delhivery.com/track/package/',
  Ekart:       'https://ekartlogistics.com/shipmenttrack/',
  BlueDart:    'https://www.bluedart.com/tracking?trackfor=',
  FedEx:       'https://www.fedex.com/fedextrack/?trknbr=',
  Xpressbees:  'https://www.xpressbees.com/track?awb=',
}

function buildTrackingUrl(courierName: string, awbNumber: string, customUrl: string) {
  if (customUrl) return customUrl
  const base = COURIER_TRACK_URLS[courierName]
  return base ? `${base}${awbNumber}` : null
}

// FIX 1: Calculate estimated delivery based on AP/TG (4-5 days) or other states (5-7 days)
function getEstimatedDelivery(order: any) {
  // If admin set a custom estimated date, use that
  if (order.estimated_delivery_date) {
    return new Date(order.estimated_delivery_date).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  }
  if (!order.created_at) return null
  const state = order.delivery_address?.state?.toLowerCase() || ''
  const isApTg = state.includes('andhra') || state.includes('telangana') || state.includes('ap') || state.includes('tg')
  const days = isApTg ? 5 : 7
  const est = new Date(order.created_at)
  est.setDate(est.getDate() + days)
  return est.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ordersApi.detail(Number(id))
      .then(r => { setOrder(r.data); setLoading(false) })
      .catch(() => { setLoading(false); navigate('/orders') })
  }, [id])

  const curIdx = STATUS_ORDER.indexOf(order?.status || 'pending')
  const trackingUrl = order?.awb_number
    ? buildTrackingUrl(order.courier_name || '', order.awb_number, order.tracking_url || '')
    : null

  const estimatedDelivery = order ? getEstimatedDelivery(order) : null

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-brand-500 mb-5 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </button>

        <h1 className="text-2xl font-bold text-gray-900 font-display mb-6">Track Your Order</h1>

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
        ) : !order ? (
          <div className="text-center py-16 text-gray-400">
            <p>Order not found</p>
            <button onClick={() => navigate('/orders')} className="mt-4 text-brand-500 font-medium">View all orders</button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Order info card */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Order Number</p>
                  <p className="font-bold text-gray-900 text-lg">{order.order_number}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {(order.status_display || order.status || '').replace(/_/g, ' ')}
                </span>
              </div>
              {order.delivery_address && (
                <div className="flex items-start gap-2 text-sm text-gray-500 mt-3">
                  <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                  <span>
                    {[
                      order.delivery_address.house_no,
                      order.delivery_address.building_street,
                      order.delivery_address.city,
                      order.delivery_address.state,
                      order.delivery_address.pincode,
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <Clock className="w-4 h-4 text-brand-500" />
                <span>Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>

              {/* FIX 1: Estimated delivery date — Amazon/Flipkart style */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && estimatedDelivery && (
                <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  <Calendar className="w-4 h-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs text-green-600 font-semibold">Estimated Delivery</p>
                    <p className="text-sm font-bold text-green-800">{estimatedDelivery}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Shipment Progress */}
            {order.status !== 'cancelled' && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-5">Shipment Progress</h2>
                <div className="space-y-0">
                  {ORDER_STEPS.map((step, i) => {
                    const stepIdx = STATUS_ORDER.indexOf(step.key)
                    const done = stepIdx < curIdx
                    const active = step.key === 'in_transit'
                      ? (order.status === 'in_transit' || order.status === 'out_for_delivery')
                      : stepIdx === curIdx
                    const Icon = step.icon
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            done ? 'bg-brand-500 text-white shadow-sm'
                            : active ? 'bg-maroon-500 text-white shadow-sm ring-4 ring-maroon-100'
                            : 'bg-gray-100 text-gray-300'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          {i < ORDER_STEPS.length - 1 && (
                            <div className={`w-0.5 h-10 mt-1 transition-all ${done ? 'bg-brand-400' : 'bg-gray-200'}`} />
                          )}
                        </div>
                        <div className="flex-1 pb-2 pt-1.5">
                          <p className={`font-semibold text-sm ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                          <p className={`text-xs mt-0.5 ${done || active ? 'text-gray-500' : 'text-gray-300'}`}>{step.desc}</p>
                          {/* FIX 2: Show AWB tracking card at In Transit step */}
                          {step.key === 'in_transit' && (done || active) && order.awb_number && (
                            <div className="mt-2 p-3 bg-cyan-50 border border-cyan-100 rounded-xl">
                              <p className="text-xs text-cyan-700 font-medium mb-1">
                                📦 {order.courier_name || 'Courier'} · AWB: <span className="font-mono font-bold">{order.awb_number}</span>
                              </p>
                              {trackingUrl && (
                                <a href={trackingUrl} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors mt-1">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Track on {order.courier_name || 'Courier'} website
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {order.status === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                <p className="text-red-700 font-semibold">This order has been cancelled</p>
                <p className="text-red-500 text-sm mt-1">If you were charged, a refund will be processed within 5–7 business days</p>
              </div>
            )}

            {/* FIX 2: Courier Tracking section */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-3">Courier Tracking</h2>
              {order.awb_number ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">{order.courier_name || 'Courier'} · Tracking Number (AWB)</p>
                      <p className="font-mono font-bold text-gray-800 tracking-wider text-base">{order.awb_number}</p>
                    </div>
                    {trackingUrl && (
                      <a href={trackingUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                        <ExternalLink className="w-4 h-4" />
                        Track Now
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Click "Track Now" to follow your shipment on the courier website.
                    If the status shows "Delivered" on the courier site, your order status here will update automatically.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-gray-500">Tracking details not available yet</p>
                  <p className="text-xs mt-1">AWB / tracking number will appear here once your order is shipped by our team</p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Items in this Order</h2>
              <div className="space-y-3">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-800">{item.product_name}</span>
                      <span className="text-gray-400 ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-gray-900">₹{Number(item.total_price).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-maroon-500">₹{Number(order.total).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
