import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Star, ToggleLeft, ToggleRight, MapPin, Phone,
  Package, Navigation, IndianRupee, ChevronRight, Loader2,
  ShoppingBag, AlertCircle, Truck, User, X,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { deliveryApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

type AssignmentStatus = 'assigned' | 'accepted' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'rejected'

interface Assignment {
  id: number
  order: number
  order_number: string
  order_total: string
  payment_method: string
  payment_status: string
  customer_name: string
  customer_phone: string
  status: AssignmentStatus
  status_display: string
  order_status: string
  delivery_address: {
    label: string; house_no: string; building_street: string; street: string
    city: string; state: string; pincode: string; landmark: string
    latitude?: string; longitude?: string; display: string
  }
  order_items: { name: string; quantity: number; price: string }[]
  assigned_at: string
  accepted_at?: string
  picked_up_at?: string
  delivered_at?: string
  estimated_delivery?: string
  partner_notes: string
  cash_collected: boolean
  cash_amount?: string
}

const STATUS_CONFIG: Record<AssignmentStatus, { color: string; bg: string; label: string; dot: string }> = {
  assigned:         { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200',   label: 'New Order',        dot: 'bg-orange-500' },
  accepted:         { color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',       label: 'Accepted',         dot: 'bg-blue-500' },
  picked_up:        { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200',   label: 'Picked Up',        dot: 'bg-purple-500' },
  out_for_delivery: { color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200',       label: 'Out for Delivery', dot: 'bg-teal-500' },
  delivered:        { color: 'text-green-700',  bg: 'bg-green-50 border-green-200',     label: 'Delivered',        dot: 'bg-green-500' },
  rejected:         { color: 'text-red-700',    bg: 'bg-red-50 border-red-200',         label: 'Rejected',         dot: 'bg-red-500' },
}

type TabType = 'active' | 'history'

function CodModal({ assignment, onConfirm, onCancel }: {
  assignment: Assignment
  onConfirm: (id: number, amount: string) => void
  onCancel: () => void
}) {
  const [cashInput, setCashInput] = useState(assignment.order_total)
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">💰 Confirm Cash Received</h3>
            <p className="text-sm text-gray-500 mt-1">Confirm cash collected before marking as delivered.</p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 mb-4 border border-orange-100">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Order</span><span className="font-semibold">{assignment.order_number}</span></div>
          <div className="flex justify-between text-sm mt-1"><span className="text-gray-600">Amount due</span><span className="font-bold text-orange-600">₹{assignment.order_total}</span></div>
          <div className="flex justify-between text-sm mt-1"><span className="text-gray-600">Customer</span><span className="text-gray-800">{assignment.customer_name}</span></div>
        </div>
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Amount Collected (₹)</label>
          <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" value={cashInput} onChange={e => setCashInput(e.target.value)} inputMode="decimal" />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">Cancel</button>
          <button onClick={() => onConfirm(assignment.id, cashInput)} className="flex-[2] py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition flex items-center justify-center gap-2">
            <IndianRupee className="w-4 h-4" /> Confirm Cash Received
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DeliveryDashboardPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [tab, setTab] = useState<TabType>('active')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [codModalAssignment, setCodModalAssignment] = useState<Assignment | null>(null)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'delivery_partner') { navigate('/'); return }
    load()
  }, [isAuthenticated])

  const load = async () => {
    setLoading(true)
    try {
      const [ar, pr] = await Promise.all([deliveryApi.myAssignments(), deliveryApi.profile()])
      setAssignments(ar.data)
      setProfile(pr.data)
      setAvailable(pr.data.is_available)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const toggleAvail = async () => {
    try {
      const r = await deliveryApi.toggleAvailability()
      setAvailable(r.data.is_available)
      toast.success(r.data.is_available ? '🟢 You are now Online' : '🔴 You are now Offline')
    } catch { toast.error('Failed') }
  }

  const doAction = async (assignment: Assignment) => {
    if (assignment.status === 'out_for_delivery' && assignment.payment_method === 'cod' && !assignment.cash_collected) {
      setCodModalAssignment(assignment); return
    }
    setActionId(assignment.id)
    try {
      if (assignment.status === 'assigned') { await deliveryApi.acceptOrder(assignment.id); toast.success('✅ Order accepted!') }
      else { await deliveryApi.updateStatus(assignment.id); toast.success('✅ Status updated!') }
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Action failed') }
    finally { setActionId(null) }
  }

  const handleConfirmCash = async (assignmentId: number, amount: string) => {
    setCodModalAssignment(null)
    setActionId(assignmentId)
    try {
      await deliveryApi.confirmCashCollected(assignmentId, parseFloat(amount))
      toast.success('💰 Cash confirmed! Now mark as delivered.')
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed to confirm cash') }
    finally { setActionId(null) }
  }

  const openMap = (addr: Assignment['delivery_address']) => {
    const query = addr.latitude && addr.longitude ? `${addr.latitude},${addr.longitude}` : encodeURIComponent(addr.display)
    window.open(`https://maps.google.com/?q=${query}`, '_blank')
  }

  const active  = assignments.filter(a => ['assigned', 'accepted', 'picked_up', 'out_for_delivery'].includes(a.status))
  const history = assignments.filter(a => ['delivered', 'rejected'].includes(a.status))
  const displayed = tab === 'active' ? active : history

  const paymentBadge = (method: string, payStatus: string, cashCollected?: boolean) => {
    if (method === 'cod') {
      if (cashCollected || payStatus === 'paid') return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ COD Collected</span>
      return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">💵 COD Pending</span>
    }
    return payStatus === 'paid'
      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ Paid Online</span>
      : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium capitalize">{payStatus}</span>
  }

  const getActionConfig = (a: Assignment) => {
    if (a.status === 'assigned') return { label: 'Accept Order', icon: CheckCircle, color: 'bg-blue-600 hover:bg-blue-700' }
    if (a.status === 'accepted') return { label: 'Mark Picked Up', icon: Package, color: 'bg-purple-600 hover:bg-purple-700' }
    if (a.status === 'picked_up') return { label: 'Out for Delivery', icon: Truck, color: 'bg-teal-600 hover:bg-teal-700' }
    if (a.status === 'out_for_delivery') {
      if (a.payment_method === 'cod' && !a.cash_collected) return { label: `Confirm Cash Received ₹${a.order_total}`, icon: IndianRupee, color: 'bg-orange-500 hover:bg-orange-600' }
      return { label: 'Mark Delivered', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' }
    }
    return null
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Profile Banner */}
        <div className="bg-gradient-to-br from-brand-600 to-maroon-600 rounded-2xl p-5 text-white mb-5 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Delivery Partner</p>
              <h1 className="text-xl font-bold">{user?.first_name} {user?.last_name}</h1>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2.5 py-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /><span className="text-sm font-semibold">{profile?.rating ?? '5.0'}</span></div>
                <div className="bg-white/20 rounded-lg px-2.5 py-1 text-sm">{profile?.total_deliveries ?? 0} deliveries</div>
                <div className="bg-white/20 rounded-lg px-2.5 py-1 text-sm capitalize">{profile?.vehicle_type ?? 'Bike'}</div>
              </div>
            </div>
            <button onClick={toggleAvail} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${available ? 'bg-brand-500 hover:bg-brand-400' : 'bg-white/10 hover:bg-white/20'}`}>
              {available ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 opacity-60" />}
              <span className="text-sm font-bold">{available ? 'Online' : 'Offline'}</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 border-t border-white/20 pt-4">
            <div className="text-center"><p className="text-white/60 text-xs">Active</p><p className="text-lg font-bold">{active.length}</p></div>
            <div className="text-center border-x border-white/20"><p className="text-white/60 text-xs">Today</p><p className="text-lg font-bold">{history.filter(a => a.delivered_at && new Date(a.delivered_at).toDateString() === new Date().toDateString()).length}</p></div>
            <div className="text-center"><p className="text-white/60 text-xs">Total</p><p className="text-lg font-bold">{profile?.total_deliveries ?? 0}</p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 bg-gray-100 rounded-xl p-1">
          {(['active', 'history'] as TabType[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'active' ? `Active (${active.length})` : `History (${history.length})`}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}

        {!loading && displayed.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              {tab === 'active' ? <ShoppingBag className="w-8 h-8 text-gray-300" /> : <CheckCircle className="w-8 h-8 text-gray-300" />}
            </div>
            <p className="text-gray-500 font-medium">{tab === 'active' ? 'No active orders' : 'No deliveries yet'}</p>
            <p className="text-gray-400 text-sm mt-1">{tab === 'active' ? 'New orders will appear here' : 'Completed deliveries will show here'}</p>
          </div>
        )}

        <div className="space-y-4">
          {displayed.map((a) => {
            const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.assigned
            const actionConfig = getActionConfig(a)
            const isExpanded = expanded === a.id
            const ActionIcon = actionConfig?.icon ?? CheckCircle

            return (
              <div key={a.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${cfg.bg}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{a.order_number}</span>
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">₹{a.order_total}</span>
                        {paymentBadge(a.payment_method, a.payment_status, a.cash_collected)}
                      </div>
                    </div>
                    <button onClick={() => setExpanded(isExpanded ? null : a.id)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                      <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-gray-500" /></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.customer_name}</p>
                      {a.customer_phone && (<a href={`tel:${a.customer_phone}`} className="flex items-center gap-1 text-xs text-blue-600"><Phone className="w-3 h-3" />{a.customer_phone}</a>)}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-gray-100 mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {a.delivery_address.house_no && <p className="text-xs font-bold text-gray-900">{a.delivery_address.house_no}</p>}
                        {a.delivery_address.building_street && <p className="text-xs text-gray-700">{a.delivery_address.building_street}</p>}
                        <p className="text-xs text-gray-500 truncate">{[a.delivery_address.street, a.delivery_address.city, a.delivery_address.pincode].filter(Boolean).join(', ')}</p>
                        {a.delivery_address.landmark && <p className="text-xs text-gray-400">Near: {a.delivery_address.landmark}</p>}
                      </div>
                      <button onClick={() => openMap(a.delivery_address)} className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded-lg hover:bg-blue-100 transition flex-shrink-0">
                        <Navigation className="w-3 h-3" /> Navigate
                      </button>
                    </div>
                  </div>

                  {a.status === 'out_for_delivery' && a.payment_method === 'cod' && !a.cash_collected && (
                    <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <p className="text-xs text-orange-700 font-medium">Collect ₹{a.order_total} cash before marking delivered</p>
                    </div>
                  )}
                  {a.cash_collected && a.payment_method === 'cod' && (
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <p className="text-xs text-green-700 font-medium">Cash ₹{a.cash_amount || a.order_total} received — now mark as delivered</p>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="space-y-3 mt-2">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Order Items</p>
                        {a.order_items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-700 py-0.5">
                            <span>{item.name} × {item.quantity}</span><span className="font-medium">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Timeline</p>
                        <div className="space-y-1.5">
                          {[
                            { label: 'Assigned', time: a.assigned_at },
                            { label: 'Accepted', time: a.accepted_at },
                            { label: 'Picked Up', time: a.picked_up_at },
                            { label: 'Delivered', time: a.delivered_at },
                          ].map(({ label, time }) => time ? (
                            <div key={label} className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                              <span className="text-gray-700 font-medium w-20">{label}</span>
                              <span className="text-gray-400">{new Date(time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {actionConfig && (
                  <div className="px-4 pb-4">
                    <button onClick={() => doAction(a)} disabled={actionId === a.id}
                      className={`w-full py-3 rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-2 ${actionConfig.color} disabled:opacity-60`}>
                      {actionId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ActionIcon className="w-4 h-4" />}
                      {actionId === a.id ? 'Updating…' : actionConfig.label}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {codModalAssignment && (
        <CodModal assignment={codModalAssignment} onConfirm={handleConfirmCash} onCancel={() => setCodModalAssignment(null)} />
      )}
    </>
  )
}
