"use client";

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

export default function Navbar() {
  const { data: session, status } = useSession()
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBalance = async () => {
    if (!session?.user?.email) return;
    
    try {
      const res = await fetch('/api/user/balance')
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchBalance()
    
    // Set up polling every 5 seconds
    const interval = setInterval(fetchBalance, 5000)
    
    // Clean up interval on component unmount
    return () => clearInterval(interval)
  }, [session])


  return (
    <nav className="border-b border-slate-800 bg-slate-950 p-4 text-white flex justify-between items-center">
      <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Kasyno
      </Link>

      <div className="flex gap-4 items-center">
        {session ? (
          <>
            <div className="bg-slate-900 px-3 py-1 rounded border border-slate-800 text-green-400 font-mono">
              ${isLoading ? '...' : balance.toFixed(2)}
            </div>
            <Link href="/profile" className="hover:text-purple-400">Profile</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="text-slate-300 hover:text-white">Login</Link>
            <Link href="/register" className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}