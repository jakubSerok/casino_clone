'use client'

import { processTransaction } from "@/actions/wallet-action"
import { useState } from "react"

export function WalletManager() {
  const [activeTab, setActiveTab] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT")
  const [message, setMessage] = useState<{ txt: string, type: 'success' | 'error' } | null>(null)

  const handleAction = async (formData: FormData) => {
    formData.append("type", activeTab)
    const res = await processTransaction(formData)
    if (res.error) setMessage({ txt: res.error, type: 'error' })
    if (res.success) setMessage({ txt: res.success as string, type: 'success' })
  }

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-white">Portfel</h2>
      
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab("DEPOSIT")} className={`px-4 py-2 rounded font-bold ${activeTab === "DEPOSIT" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400"}`}>DEPOSIT</button>
        <button onClick={() => setActiveTab("WITHDRAW")} className={`px-4 py-2 rounded font-bold ${activeTab === "WITHDRAW" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400"}`}>WITHDRAW</button>
      </div>

      <form action={handleAction} className="space-y-4">
        <div>
          <label className="block text-slate-400 text-sm mb-1">Amount (PLN)</label>
          <input type="number" name="amount" min="1" step="0.01" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" required />
        </div>
        
        <button className={`w-full py-2 rounded font-bold text-white transition ${activeTab === "DEPOSIT" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
          {activeTab === "DEPOSIT" ? "Deposit" : "Withdraw"}
        </button>

        {message && (
          <p className={`text-center text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.txt}
          </p>
        )}
      </form>
    </div>
  )
}