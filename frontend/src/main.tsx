import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryProvider } from './components/providers/QueryProvider'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1f2937',
              border: '1px solid #fdd5a8',
              borderLeft: '4px solid #e07b2a',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#e07b2a', secondary: '#fff' } },
            error: { iconTheme: { primary: '#a0182d', secondary: '#fff' } },
          }}
        />
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>
)
