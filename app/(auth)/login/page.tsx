'use client'

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const res = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false, 
    })

    if (res?.error) {
      setError("Nieprawidłowy email lub hasło")
    } else {
      router.push("/") 
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-green-500">Kasyno Login</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input name="email" type="email" className="w-full p-2 rounded bg-slate-800 border border-slate-700 focus:border-green-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Hasło</label>
            <input name="password" type="password" className="w-full p-2 rounded bg-slate-800 border border-slate-700 focus:border-green-500 outline-none" required />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button type="submit" className="w-full py-2 bg-green-600 hover:bg-green-700 rounded font-bold transition">
            Zaloguj się
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Nie masz konta? <Link href="/register" className="text-green-400 hover:underline">Zarejestruj się</Link>
        </p>
      </div>
    </div>
  )
}