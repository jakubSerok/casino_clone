'use client'

import { registerUser } from "@/actions/auth-action"
import { useFormState } from "react-dom"
import Link from "next/link"

export default function RegisterPage() {
  // useFormState pozwala obsługiwać błędy z Server Action
  const [state, action] = useFormState(registerUser, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-500">Kasyno Register</h1>
        
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input name="username" type="text" className="w-full p-2 rounded bg-slate-800 border border-slate-700 focus:border-purple-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input name="email" type="email" className="w-full p-2 rounded bg-slate-800 border border-slate-700 focus:border-purple-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Hasło</label>
            <input name="password" type="password" className="w-full p-2 rounded bg-slate-800 border border-slate-700 focus:border-purple-500 outline-none" required />
          </div>

          {state?.error && <p className="text-red-500 text-sm text-center">{state.error}</p>}
          {state?.success && <p className="text-green-500 text-sm text-center">{state.success}</p>}

          <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded font-bold transition">
            Załóż konto
          </button>
        </form>
        
        <p className="mt-4 text-center text-sm text-slate-400">
          Masz już konto? <Link href="/login" className="text-purple-400 hover:underline">Zaloguj się</Link>
        </p>
      </div>
    </div>
  )
}