import { create } from 'zustand'
import { cartApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Product {
  id: number
  name: string
  slug: string
  price: number
  mrp: number
  unit: string
  image: string
  is_in_stock: boolean
  current_stock: number
  discount_percentage: number
  category?: { name: string; slug: string }
}

interface CartItem {
  id: number
  product: Product
  quantity: number
  total_price: number
}

interface Cart {
  id: number
  items: CartItem[]
  total_price: number
  total_items: number
}

interface CartState {
  cart: Cart | null
  isLoading: boolean
  totalItems: number
  fetchCart: () => Promise<void>
  addItem: (productId: number, quantity?: number) => Promise<void>
  updateItem: (itemId: number, quantity: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  isLoading: false,
  totalItems: 0,

  fetchCart: async () => {
    try {
      set({ isLoading: true })
      const res = await cartApi.get()
      set({ cart: res.data, totalItems: res.data.total_items })
    } catch {}
    finally { set({ isLoading: false }) }
  },

  addItem: async (productId, quantity = 1) => {
    try {
      const res = await cartApi.addItem(productId, quantity)
      set({ cart: res.data, totalItems: res.data.total_items })
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to add item')
      throw e
    }
  },

  updateItem: async (itemId, quantity) => {
    try {
      const res = await cartApi.updateItem(itemId, quantity)
      set({ cart: res.data, totalItems: res.data.total_items })
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Update failed')
    }
  },

  removeItem: async (itemId) => {
    try {
      const res = await cartApi.removeItem(itemId)
      set({ cart: res.data, totalItems: res.data.total_items })
      toast.success('Item removed')
    } catch {}
  },
}))
