import React from 'react'
import { Routes, Route } from 'react-router-dom'
import FantaBeach from './pages/FantaBeach.jsx'

// Future routes will go here:
// import Login from './pages/Login.jsx'
// import { AuthGuard } from './components/layout/AuthGuard.jsx'

export default function App() {
  return (
    <Routes>
      {/* Prototype: single page, no auth yet */}
      <Route path="/*" element={<FantaBeach />} />

      {/* Future structure (uncomment when Supabase is ready):
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <AuthGuard>
          <FantaBeach />
        </AuthGuard>
      } />
      */}
    </Routes>
  )
}
