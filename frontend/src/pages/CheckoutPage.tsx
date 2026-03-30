import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Plus, Smartphone, CreditCard, Banknote,
  ShieldCheck, Loader2, Navigation, Home, Briefcase, X, Check, Truck, Tag
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { authApi, ordersApi, paymentsApi } from '@/lib/api'
import toast from 'react-hot-toast'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace('/api', '')
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

interface Address {
  id: number
  label: string
  house_no: string
  building_street: string
  street: string
  city: string
  state: string
  pincode: string
  landmark: string
  latitude?: number | null
  longitude?: number | null
  is_default: boolean
}

interface DeliveryInfo {
  subtotal: number
  delivery_fee: number
  total: number
  state: string
  is_ap_telangana: boolean
  free_delivery_threshold: number
  amount_for_free_delivery: number
}

type PaymentMethod = 'upi' | 'card' | 'cod'

const PAYMENT_OPTIONS = [
  { id: 'upi' as PaymentMethod, label: 'UPI', subtitle: 'PhonePe, GPay, Paytm & more', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-400' },
  { id: 'card' as PaymentMethod, label: 'Credit / Debit Card', subtitle: 'Visa, Mastercard, RuPay', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400' },
  { id: 'cod' as PaymentMethod, label: 'Cash on Delivery', subtitle: 'Pay when your order arrives', icon: Banknote, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-400' },
]

const BLANK_ADDR = {
  label: 'Home', house_no: '', building_street: '', street: '',
  city: '', state: '', pincode: '', landmark: '',
  latitude: null as number | null, longitude: null as number | null,
}

declare global { interface Window { Razorpay: any } }

const AP_TS_PINCODE_PREFIXES = [
  '500','501','502','503','504','505','506','507','508','509',
  '515','516','517','518','519','520','521','522','523','524',
  '525','526','527','528','529','530','531','532','533','534',
  '535','536',
]

function isPincodeAPTS(pincode: string): boolean {
  const prefix = pincode.replace(/\s/g, '').substring(0, 3)
  return AP_TS_PINCODE_PREFIXES.includes(prefix)
}

function getStateFromPincode(pincode: string): string {
  const prefix = pincode.replace(/\s/g, '').substring(0, 3)
  const num = parseInt(prefix)
  if (num >= 500 && num <= 509) return 'Telangana'
  if (num >= 510 && num <= 535) return 'Andhra Pradesh'
  return ''
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const { cart, fetchCart } = useCartStore()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi')
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newAddr, setNewAddr] = useState({ ...BLANK_ADDR })
  const [locating, setLocating] = useState(false)
  const [savingAddr, setSavingAddr] = useState(false)
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null)
  const [loadingDelivery, setLoadingDelivery] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth/login'); return }
    fetchCart()
    authApi.getAddresses().then(r => {
      const list = r.data.results ?? r.data
      setAddresses(list)
      const def = list.find((a: Address) => a.is_default)
      if (def) setSelectedAddress(def.id)
    }).catch(() => {})

    if (!document.querySelector('script[src*="razorpay"]')) {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.async = true
      document.body.appendChild(s)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!selectedAddress) { setDeliveryInfo(null); return }
    setLoadingDelivery(true)
    ordersApi.deliveryFeePreview(selectedAddress)
      .then(r => setDeliveryInfo(r.data))
      .catch(() => setDeliveryInfo(null))
      .finally(() => setLoadingDelivery(false))
  }, [selectedAddress])

  const handlePincodeChange = (val: string) => {
    const cleanPin = val.replace(/\D/g, '').substring(0, 6)
    let state = newAddr.state
    if (cleanPin.length >= 3) {
      const detectedState = getStateFromPincode(cleanPin)
      if (detectedState) state = detectedState
    }
    setNewAddr(p => ({ ...p, pincode: cleanPin, state }))
  }

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'BammidiCollections/1.0' } }
      )
      const data = await res.json()
      const a = data.address || {}
      const pincode = a.postcode || ''
      const geocodeState = a.state || ''
      const state = pincode.length >= 3 ? (getStateFromPincode(pincode) || geocodeState) : geocodeState
      setNewAddr(prev => ({
        ...prev,
        street: [a.road, a.suburb, a.neighbourhood, a.quarter].filter(Boolean).join(', '),
        building_street: [a.suburb, a.city_district].filter(Boolean).join(', '),
        city: a.city || a.town || a.village || a.county || '',
        state,
        pincode,
        latitude: lat,
        longitude: lon,
      }))
    } catch {
      toast.error('Could not auto-fill location details')
    }
  }

  const handleGPS = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          toast.success('Location detected! Please verify and add your door number.')
        } catch {
          toast.error('Could not get location details')
        } finally { setLocating(false) }
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied.')
        } else {
          toast.error('Could not detect location. Please fill address manually.')
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const handleSaveAddress = async () => {
    if (!newAddr.house_no.trim()) { toast.error('Please enter your house/flat number'); return }
    if (!newAddr.city.trim()) { toast.error('Please enter city'); return }
    if (!newAddr.state.trim()) { toast.error('Please enter state'); return }
    if (!newAddr.pincode.trim() || newAddr.pincode.length < 6) { toast.error('Please enter a valid 6-digit pincode'); return }

    setSavingAddr(true)
    try {
      // FIX: strip null lat/lng so backend does not reject with validation error
      const addrPayload: any = {
        ...newAddr,
        state: getStateFromPincode(newAddr.pincode) || newAddr.state,
      }
      if (addrPayload.latitude === null) delete addrPayload.latitude
      if (addrPayload.longitude === null) delete addrPayload.longitude
      const r = await authApi.createAddress(addrPayload)
      const updated = await authApi.getAddresses()
      const list = updated.data.results ?? updated.data
      setAddresses(list)
      setSelectedAddress(r.data.id)
      setShowAdd(false)
      setNewAddr({ ...BLANK_ADDR })
      toast.success('Address saved!')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save address.')
    } finally {
      setSavingAddr(false)
    }
  }

  const subtotal = cart?.total_price || 0
  const deliveryFee = deliveryInfo ? deliveryInfo.delivery_fee : 0
  const total = deliveryInfo ? deliveryInfo.total : subtotal

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return }
    if (!cart?.items?.length) { toast.error('Your bag is empty'); return }
    setLoading(true)
    try {
      const orderRes = await ordersApi.create({ address_id: selectedAddress, payment_method: paymentMethod })
      const order = orderRes.data.order

      if (paymentMethod === 'cod') {
        navigate(`/order-success?order_id=${order.id}`)
        return
      }

      const payRes = await paymentsApi.createRazorpayOrder(order.id)
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: payRes.data.amount,
        currency: 'INR',
        name: "Bammidi's Collections",
        description: `Order #BC${String(order.id).padStart(6, '0')}`,
        order_id: payRes.data.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await paymentsApi.verifyPayment({ order_id: order.id, ...response })
            navigate(`/order-success?order_id=${order.id}`)
          } catch { toast.error('Payment verification failed') }
        },
        prefill: { name: `${user?.first_name} ${user?.last_name}`, email: user?.email },
        theme: { color: '#e07b2a' },
        modal: { ondismiss: () => { setLoading(false); toast('Payment cancelled', { icon: '⚠️' }) } },
      })
      rzp.open()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Could not place order')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
  const labelCls = "text-xs font-medium text-gray-600 mb-1 block"

  return (
    <div className="min-h-screen bg-[#fdfaf7]">
      <Header />

      <div className="bg-maroon-500 text-white py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5"><Truck size={12} className="text-gold-400" /> AP & Telangana: Free delivery ≥ ₹499</span>
          <span className="text-white/40">|</span>
          <span className="flex items-center gap-1.5"><Truck size={12} className="text-gold-400" /> Other States: Free delivery ≥ ₹999</span>
          <span className="text-white/40">|</span>
          <span className="flex items-center gap-1.5"><Tag size={12} className="text-gold-400" /> Below threshold: ₹199</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-brand-500 mb-5 text-sm font-medium transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            {/* Address */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin size={18} className="text-brand-500" /> Delivery Address
                </h2>
                <button onClick={() => setShowAdd(!showAdd)} className="text-brand-500 hover:text-brand-600 text-sm font-medium flex items-center gap-1 transition-colors">
                  <Plus size={14} /> Add New
                </button>
              </div>

              {addresses.length === 0 && !showAdd && (
                <div className="text-center py-8 text-gray-400">
                  <MapPin size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No addresses saved. Add one to continue.</p>
                  <button onClick={() => setShowAdd(true)} className="mt-3 text-brand-500 text-sm font-medium underline">Add address</button>
                </div>
              )}

              <div className="space-y-3">
                {addresses.map(addr => (
                  <label key={addr.id} className={`flex gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddress === addr.id ? 'border-brand-400 bg-brand-50' : 'border-gray-100 hover:border-gray-300'}`}>
                    <input type="radio" name="addr" checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} className="mt-1 accent-brand-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {addr.label === 'Home' ? <Home size={14} className="text-brand-500" /> : <Briefcase size={14} className="text-brand-500" />}
                        <span className="font-semibold text-sm text-gray-800">{addr.label}</span>
                        {addr.is_default && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">Default</span>}
                        {addr.pincode && isPincodeAPTS(addr.pincode) && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">AP/TG</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {[addr.house_no, addr.building_street, addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {showAdd && (
                <div className="mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 text-sm">New Address</h3>
                    <button onClick={() => { setShowAdd(false); setNewAddr({ ...BLANK_ADDR }) }}>
                      <X size={16} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>

                  <button
                    onClick={handleGPS}
                    disabled={locating}
                    className="w-full mb-4 flex items-center justify-center gap-2 border-2 border-dashed border-brand-300 text-brand-600 hover:bg-brand-50 bg-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                    {locating ? 'Detecting your location...' : '📍 Auto-detect using GPS'}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Label</label>
                      <select value={newAddr.label} onChange={e => setNewAddr(p => ({ ...p, label: e.target.value }))} className={inputCls}>
                        <option>Home</option><option>Work</option><option>Other</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>House / Flat / Door No. *</label>
                      <input value={newAddr.house_no} onChange={e => setNewAddr(p => ({ ...p, house_no: e.target.value }))} placeholder="e.g. Flat 4B, Door No. 12" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Building / Street / Area</label>
                      <input value={newAddr.building_street} onChange={e => setNewAddr(p => ({ ...p, building_street: e.target.value }))} placeholder="Building name, street, area" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Pincode * (auto-detects state)</label>
                      <input
                        value={newAddr.pincode}
                        onChange={e => handlePincodeChange(e.target.value)}
                        placeholder="6-digit pincode"
                        maxLength={6}
                        className={inputCls}
                      />
                      {newAddr.pincode.length >= 3 && isPincodeAPTS(newAddr.pincode) && (
                        <p className="text-xs text-brand-600 mt-1 font-medium">✅ AP/Telangana — Free delivery ≥ ₹499!</p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>City *</label>
                      <input value={newAddr.city} onChange={e => setNewAddr(p => ({ ...p, city: e.target.value }))} placeholder="City" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>State *</label>
                      <input value={newAddr.state} onChange={e => setNewAddr(p => ({ ...p, state: e.target.value }))} placeholder="State (auto-filled from pincode)" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Landmark (optional)</label>
                      <input value={newAddr.landmark} onChange={e => setNewAddr(p => ({ ...p, landmark: e.target.value }))} placeholder="Near temple, school, etc." className={inputCls} />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAddress}
                    disabled={savingAddr}
                    className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {savingAddr ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {savingAddr ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              )}
            </div>

            {/* Delivery fee info */}
            {selectedAddress && (
              <div className={`rounded-2xl border p-4 ${deliveryInfo?.is_ap_telangana ? 'bg-brand-50 border-brand-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-3">
                  <Truck size={18} className={`mt-0.5 ${deliveryInfo?.is_ap_telangana ? 'text-brand-500' : 'text-amber-500'}`} />
                  <div>
                    {loadingDelivery ? (
                      <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Calculating delivery fee...</p>
                    ) : deliveryInfo ? (
                      <>
                        <p className="text-sm font-semibold text-gray-800">
                          {deliveryInfo.state} {deliveryInfo.is_ap_telangana ? '— AP / Telangana region 🏠' : '— Other State'}
                        </p>
                        {deliveryInfo.delivery_fee === 0 ? (
                          <p className="text-sm text-brand-600 font-medium mt-0.5">🎉 You qualify for FREE delivery!</p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-0.5">
                            Add ₹{deliveryInfo.amount_for_free_delivery?.toFixed(0)} more for free delivery
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Select address to see delivery fee</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-brand-500" /> Payment Method
              </h2>
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map(opt => (
                  <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === opt.id ? `${opt.border} ${opt.bg}` : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" name="payment" value={opt.id} checked={paymentMethod === opt.id} onChange={() => setPaymentMethod(opt.id)} className="accent-brand-500" />
                    <div className={`w-10 h-10 rounded-full ${opt.bg} flex items-center justify-center flex-shrink-0`}>
                      <opt.icon size={18} className={opt.color} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.subtitle}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Order Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {cart?.items?.map((item: any) => {
                  const imgSrc = item.product?.image
                    ? (item.product.image.startsWith('http') ? item.product.image : `${API_BASE}${item.product.image}`)
                    : null
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {imgSrc ? <img src={imgSrc} alt={item.product?.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🥻</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{item.product?.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900">₹{(parseFloat(item.product?.price) * item.quantity).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({cart?.total_items || 0} items)</span>
                  <span>₹{parseFloat(String(subtotal)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery</span>
                  {loadingDelivery ? (
                    <span className="text-gray-400 text-xs flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Calculating</span>
                  ) : (
                    <span className={deliveryFee === 0 ? 'text-brand-600 font-medium' : 'text-gray-800'}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  )}
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-maroon-500">₹{parseFloat(String(total)).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress || !cart?.items?.length}
                className="mt-5 w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Placing Order...</> : `Place Order — ₹${parseFloat(String(total)).toLocaleString('en-IN')}`}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
                <ShieldCheck size={13} className="text-brand-500" /> Secure checkout by Razorpay
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
