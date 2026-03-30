import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('no refresh')
        const res = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh })
        localStorage.setItem('access_token', res.data.access)
        original.headers.Authorization = `Bearer ${res.data.access}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

export const authApi = {
  register: (data: any) => api.post('/auth/register/', data),
  login: (email: string, password: string) => api.post('/auth/login/', { email, password }),
  logout: (refresh: string) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  updateProfile: (data: any) => api.patch('/auth/profile/', data),
  getAddresses: () => api.get('/auth/addresses/'),
  createAddress: (data: any) => api.post('/auth/addresses/', data),
  deleteAddress: (id: number) => api.delete(`/auth/addresses/${id}/`),
}

export const productsApi = {
  list: (params?: any) => api.get('/products/', { params }),
  detail: (slug: number | string) => api.get(`/products/${slug}/`),
  categories: () => api.get('/products/categories/'),
  featured: () => api.get('/products/featured/'),
}

export const adminApi = {
  stats: () => api.get('/auth/admin/stats/'),
  orders: (params?: any) => api.get('/orders/admin/all/', { params }),
  updateOrderStatus: (id: number, status: string) =>
    api.patch(`/orders/admin/${id}/status/`, { status }),
  csvUpload: (file: File) => {
    const fd = new FormData(); fd.append('csv_file', file)
    return api.post('/products/admin/csv-upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  updateOrderAWB: (id: number, data: { awb_number: string; tracking_url: string; courier_name: string }) =>
    api.patch(`/orders/admin/${id}/awb/`, data),
  allProducts: () => api.get('/products/admin/all/'),
  createProduct: (data: FormData) =>
    api.post('/products/admin/create/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateProduct: (id: number, data: FormData) =>
    api.patch(`/products/admin/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteProduct: (id: number) => api.delete(`/products/admin/${id}/`),
  inventory: () => api.get('/products/admin/inventory/'),
  updateInventory: (productId: number, data: any) =>
    api.patch(`/products/admin/inventory/${productId}/`, data),
  allCategories: () => api.get('/products/admin/categories/'),
  createCategory: (data: any) => api.post('/products/admin/categories/', data),
  updateCategory: (id: number, data: any) =>
    api.put(`/products/admin/categories/${id}/`, data),
  deleteCategory: (id: number) => api.delete(`/products/admin/categories/${id}/`),
  users: (params?: any) => api.get('/auth/admin/users/', { params }),
  updateUser: (id: number, data: any) => api.patch(`/auth/admin/users/${id}/`, data),
  deliveryPartners: () => api.get('/delivery/admin/partners/'),
  createDeliveryPartner: (data: any) => api.post('/delivery/admin/partners/create/', data),
  updateDeliveryPartner: (id: number, data: any) =>
    api.patch(`/delivery/admin/partners/${id}/`, data),
  deliveryAssignments: () => api.get('/delivery/admin/assignments/'),
  assignOrder: (orderId: number, partnerId?: number) =>
    api.post(`/delivery/admin/orders/${orderId}/assign/`, { partner_id: partnerId }),
}

export const deliveryApi = {
  profile: () => api.get('/delivery/profile/'),
  myAssignments: () => api.get('/delivery/assignments/'),
  activeAssignment: () => api.get('/delivery/assignments/active/'),
  acceptOrder: (assignmentId: number) =>
    api.post(`/delivery/assignments/${assignmentId}/accept/`),
  updateStatus: (assignmentId: number, data?: any) =>
    api.post(`/delivery/assignments/${assignmentId}/status/`, data || {}),
  confirmCashCollected: (assignmentId: number, amount: number) =>
    api.post(`/delivery/assignments/${assignmentId}/collect-cash/`, { cash_amount: amount }),
  toggleAvailability: () => api.post('/delivery/availability/'),
}

export const cartApi = {
  get: () => api.get('/orders/cart/'),
  addItem: (product_id: number, quantity: number) => api.post('/orders/cart/add/', { product_id, quantity }),
  updateItem: (item_id: number, quantity: number) => api.put(`/orders/cart/items/${item_id}/`, { quantity }),
  removeItem: (item_id: number) => api.delete(`/orders/cart/items/${item_id}/remove/`),
}

export const ordersApi = {
  list: () => api.get('/orders/'),
  detail: (id: number) => api.get(`/orders/${id}/`),
  create: (data: any) => api.post('/orders/create/', data),
  deliveryFeePreview: (address_id: number) => api.post('/orders/delivery-fee-preview/', { address_id }),
}

export const paymentsApi = {
  createRazorpayOrder: (orderId: number) => api.post('/payments/razorpay/create/', { order_id: orderId }),
  verifyPayment: (data: any) => api.post('/payments/razorpay/verify/', data),
  processRefund: (orderId: number) => api.post(`/payments/refund/${orderId}/`),
}
