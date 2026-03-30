import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import OrdersPage from './pages/OrdersPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import OrderTrackingPage from './pages/OrderTrackingPage'
import AdminDashboardPage from './pages/dashboard/AdminDashboardPage'
import DeliveryDashboardPage from './pages/dashboard/DeliveryDashboardPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:slug" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/order-success" element={<OrderSuccessPage />} />
      <Route path="/order-tracking/:id" element={<OrderTrackingPage />} />
      <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
      <Route path="/dashboard/delivery" element={<DeliveryDashboardPage />} />
    </Routes>
  )
}
