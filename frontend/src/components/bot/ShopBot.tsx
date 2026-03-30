import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Send, Mic, MicOff, Sparkles, ChevronRight,
  Plus, Minus, RotateCcw,
  ArrowRight, Package, Loader2, Bot
} from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Product {
  id: number
  name: string
  slug: string
  price: number
  mrp: number
  unit: string
  image?: string
  is_in_stock: boolean
  discount_percentage: number
  category_name?: string
}

interface Category {
  id: number
  name: string
  slug: string
  description?: string
}

interface BotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: Product[]
  categories?: Category[]
  suggestions?: string[]
  action?: string
  ts: number
}

const CATEGORY_EMOJI: Record<string, string> = {
  vegetables: '🥦', fruits: '🍎', dairy: '🥛', snacks: '🍿',
  grains: '🌾', oils: '🫙', eggs: '🥚', meat: '🥩',
  seafood: '🐟', beverages: '🥤', 'personal-care': '🧴',
  frozen: '🧊', bakery: '🍞', spices: '🌶️',
}

const getProductEmoji = (name: string, catSlug?: string): string => {
  if (catSlug && CATEGORY_EMOJI[catSlug]) return CATEGORY_EMOJI[catSlug]
  const n = name.toLowerCase()
  for (const [k, v] of Object.entries({
    tomato: '🍅', potato: '🥔', onion: '🧅', carrot: '🥕', spinach: '🥬',
    apple: '🍎', banana: '🍌', mango: '🥭', orange: '🍊',
    milk: '🥛', curd: '🫙', paneer: '🧀', butter: '🧈',
    rice: '🌾', atta: '🫓', dal: '🫘',
    egg: '🥚', chicken: '🍗', fish: '🐟',
  })) {
    if (n.includes(k)) return v
  }
  return '🛒'
}

function BotProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { cart, addItem, updateItem, removeItem } = useCartStore()
  const [busy, setBusy] = useState(false)
  const [imgErr, setImgErr] = useState(false)

  const cartItem = cart?.items.find(i => i.product.id === product.id)
  const qty = cartItem?.quantity || 0
  const emoji = getProductEmoji(product.name, product.category_name?.toLowerCase())

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated) { navigate('/auth/login'); return }
    setBusy(true)
    try { await addItem(product.id) } finally { setBusy(false) }
  }
  const handleInc = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!cartItem) return
    setBusy(true)
    try { await updateItem(cartItem.id, qty + 1) } finally { setBusy(false) }
  }
  const handleDec = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!cartItem) return
    setBusy(true)
    try {
      qty === 1 ? await removeItem(cartItem.id) : await updateItem(cartItem.id, qty - 1)
    } finally { setBusy(false) }
  }

  return (
    <div
      onClick={() => navigate(`/products/${product.slug}`)}
      className="flex-shrink-0 w-[140px] bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div className="relative h-[88px] bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center overflow-hidden">
        {product.discount_percentage > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg z-10 tracking-tight">
            -{product.discount_percentage}%
          </span>
        )}
        {!product.is_in_stock && (
          <div className="absolute inset-0 bg-white/85 flex items-center justify-center z-10">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Out of stock</span>
          </div>
        )}
        {product.image && !imgErr ? (
          <img
            src={product.image} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="text-[2.2rem] drop-shadow-sm group-hover:scale-110 transition-transform duration-200">
            {emoji}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide truncate">{product.unit}</p>
        <p className="text-[11px] font-bold text-gray-800 leading-tight line-clamp-2 mt-0.5 min-h-[26px]">
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-xs font-black text-gray-900">₹{product.price}</span>
            {product.mrp > product.price && (
              <span className="text-[9px] text-gray-400 line-through ml-1">₹{product.mrp}</span>
            )}
          </div>
          {product.is_in_stock ? (
            qty > 0 ? (
              <div className="flex items-center bg-emerald-600 rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <button onClick={handleDec} disabled={busy}
                  className="text-white w-5 h-5 flex items-center justify-center hover:bg-emerald-700 transition-colors">
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="text-white font-black text-[11px] px-1 min-w-[14px] text-center">{qty}</span>
                <button onClick={handleInc} disabled={busy}
                  className="text-white w-5 h-5 flex items-center justify-center hover:bg-emerald-700 transition-colors">
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <button onClick={handleAdd} disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 leading-none">
                {busy ? '…' : 'ADD'}
              </button>
            )
          ) : (
            <span className="text-[9px] text-gray-300 font-semibold">N/A</span>
          )}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-2xl rounded-tl-none border border-gray-100 w-fit shadow-sm">
      <Bot className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
            style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }} />
        ))}
      </div>
    </div>
  )
}

function VoiceWave() {
  return (
    <div className="flex items-center gap-0.5 h-5">
      {[3, 5, 8, 5, 8, 3, 6, 4, 7, 5].map((h, i) => (
        <span key={i} className="w-0.5 bg-rose-400 rounded-full animate-pulse"
          style={{ height: `${h}px`, animationDelay: `${i * 0.08}s`, animationDuration: '0.6s' }} />
      ))}
    </div>
  )
}

export default function ShopBot() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<BotMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [greeted, setGreeted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setUnreadCount(0)
      setTimeout(() => inputRef.current?.focus(), 250)
      if (!greeted) {
        setGreeted(true)
        setMessages([{
          id: 'greet',
          role: 'assistant',
          content: "Hey there! 👋 I'm ShopBot — your AI shopping assistant. Ask me anything about our products, or just say what you need!",
          suggestions: ['🥻 Browse Sarees', '👗 Dresses', '🌸 Kurtis', '🔥 Best deals today'],
          action: 'chat',
          ts: Date.now(),
        }])
      }
    }
  }, [open, greeted])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: BotMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }))
      const res = await api.post('/bot/chat/', { message: text.trim(), history })
      const data = res.data
      const botMsg: BotMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: data.message || "Here's what I found!",
        products: data.products || [],
        categories: data.categories || [],
        suggestions: data.suggestions || [],
        action: data.action,
        ts: Date.now(),
      }
      setMessages(prev => [...prev, botMsg])
      if (!open) setUnreadCount(c => c + 1)
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "I'm having a bit of trouble right now. Try browsing our products directly!",
        suggestions: ['🛒 Browse products', '🏠 Go to homepage'],
        action: 'chat',
        ts: Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, open])

  const toggleMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Voice input not supported in this browser'); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const r = new SR()
    r.lang = 'en-IN'; r.continuous = false; r.interimResults = false
    r.onstart = () => setListening(true)
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript
      setListening(false); setInput(t)
      setTimeout(() => sendMessage(t), 400)
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    recognitionRef.current = r; r.start()
  }, [listening, sendMessage])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const resetChat = () => { setMessages([]); setGreeted(false); setUnreadCount(0) }
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open ShopBot"
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 transition-all duration-300
                    ${open ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}
                    bg-gradient-to-br from-brand-500 to-maroon-600 text-white
                    rounded-2xl px-4 py-3 shadow-2xl hover:scale-105 active:scale-95`}
        style={{ boxShadow: '0 8px 32px rgba(224,123,42,0.4)' }}
      >
        <span className="absolute inset-0 rounded-2xl bg-brand-400 animate-ping opacity-20 pointer-events-none" />
        <div className="relative w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🛍️</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs font-black tracking-tight leading-none">ShopBot</span>
          <span className="text-[10px] text-brand-200 leading-none mt-0.5">AI Assistant</span>
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-maroon-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out origin-bottom-right
                    ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-90 translate-y-4 pointer-events-none'}`}
        style={{ width: 'min(400px, calc(100vw - 24px))', height: 'min(600px, calc(100vh - 80px))' }}
      >
        <div className="flex flex-col h-full rounded-3xl overflow-hidden bg-white border border-gray-200/80"
          style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2), 0 8px 24px rgba(224,123,42,0.1)' }}>

          {/* Header */}
          <div className="flex-shrink-0 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #c45f15 0%, #e07b2a 50%, #f8943a 100%)' }}>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-xl backdrop-blur-sm">
                    🛍️
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-brand-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-black text-sm tracking-tight">ShopBot</p>
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  </div>
                  <p className="text-brand-200 text-[11px] font-medium">AI-powered · Always online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={resetChat} title="Clear chat"
                  className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white/70 hover:text-white">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white/70 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
            style={{ background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)', scrollbarWidth: 'thin' }}>
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1
              return (
                <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-brand-500 text-white rounded-2xl rounded-tr-sm shadow-md'
                      : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm'}`}>
                    {msg.content}
                  </div>

                  {msg.products && msg.products.length > 0 && (
                    <div className="w-full max-w-full">
                      <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {msg.products.map(p => <BotProductCard key={p.id} product={p} />)}
                      </div>
                      <button
                        onClick={() => { navigate(`/products?search=${encodeURIComponent(msg.content)}`); setOpen(false) }}
                        className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-600 font-bold hover:text-brand-700 transition-colors">
                        <span>See all {msg.products.length}+ results</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {msg.categories && msg.categories.length > 0 && msg.action === 'show_categories' && (
                    <div className="w-full grid grid-cols-2 gap-2">
                      {msg.categories.map(c => (
                        <button key={c.id}
                          onClick={() => { navigate(`/products?category=${c.slug}`); setOpen(false) }}
                          className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-3 py-2.5 hover:border-brand-300 hover:bg-brand-50 transition-all text-left shadow-sm group">
                          <span className="text-xl flex-shrink-0">{CATEGORY_EMOJI[c.slug] || '🛒'}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{c.name}</p>
                            {c.description && <p className="text-[10px] text-gray-400 truncate">{c.description}</p>}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 flex-shrink-0 ml-auto transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.action === 'check_order' && (
                    <button onClick={() => { navigate('/orders'); setOpen(false) }}
                      className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm">
                      <Package className="w-3.5 h-3.5" /> View My Orders <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && isLast && !loading && (
                    <div className="flex flex-wrap gap-1.5 max-w-full">
                      {msg.suggestions.map((s, si) => (
                        <button key={si} onClick={() => sendMessage(s)}
                          className="text-[11px] font-semibold bg-white border border-brand-200 text-brand-700 px-3 py-1.5 rounded-full hover:bg-brand-50 hover:border-brand-400 transition-all shadow-sm active:scale-95">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 px-0.5">{fmtTime(msg.ts)}</span>
                </div>
              )
            })}
            {loading && <div className="flex items-start"><TypingIndicator /></div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 px-3 py-3">
            {listening && (
              <div className="flex items-center gap-2.5 mb-2.5 px-3 py-2 bg-rose-50 rounded-xl border border-rose-100">
                <VoiceWave />
                <span className="text-xs text-rose-600 font-semibold flex-1">Listening… speak now</span>
                <button onClick={toggleMic} className="text-rose-500 hover:text-rose-700 transition"><MicOff className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <div className="flex items-center gap-2 bg-gray-50 rounded-2xl border-2 border-gray-200 focus-within:border-brand-400 focus-within:bg-white transition-all duration-200 px-3.5 py-2.5">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder={listening ? 'Listening…' : "Ask about any product…"}
                disabled={loading || listening}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0" />
              <button onClick={toggleMic} disabled={loading} title={listening ? 'Stop' : 'Voice input'}
                className={`p-1.5 rounded-xl transition-all flex-shrink-0 disabled:opacity-40 ${listening ? 'bg-rose-100 text-rose-500' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50'}`}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim() || listening}
                className="flex-shrink-0 p-2 bg-brand-500 hover:bg-brand-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-150">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-300 mt-2 tracking-wide">ShopBot AI · Tap mic 🎙️ or type</p>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] sm:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  )
}
