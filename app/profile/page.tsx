import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { WalletManager } from "@/app/components/profile/WalletForms"
import { EditProfileForm } from "@/app/components/profile/EditProfileForm"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
      gameHistory: { orderBy: { createdAt: 'desc' } }
    }
  })

  if (!user) return null

 
  const totalBet = user.gameHistory.reduce((acc, game) => acc + game.bet, 0)
  const totalWon = user.gameHistory.reduce((acc, game) => acc + game.payout, 0)
  const netProfit = totalWon - totalBet

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Profile</h1>

        {/* Sekcja górna: Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col items-center">
            <span className="text-slate-400 text-sm">Balance</span>
            <span className="text-4xl font-mono font-bold text-green-400">${user.balance.toFixed(2)}</span>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col items-center">
            <span className="text-slate-400 text-sm">Net Profit (Games)</span>
            <span className={`text-4xl font-mono font-bold ${netProfit >= 0 ? "text-blue-400" : "text-red-400"}`}>
              {netProfit >= 0 ? "+" : ""}{netProfit.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col items-center">
             <span className="text-slate-400 text-sm">Games Played</span>
             <span className="text-4xl font-mono font-bold text-purple-400">{user.gameHistory.length}</span>
          </div>
        </div>

        {/* Sekcja środkowa: Zarządzanie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <WalletManager />
            {/* <EditProfileForm user={user} /> */}
        </div>

        {/* Sekcja dolna: Historia */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="text-xl font-bold mb-4">Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Amoute</th>
                </tr>
              </thead>
              <tbody>
                {user.transactions.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-4 text-slate-500">No history</td></tr>
                ) : (
                    user.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                        <td className="py-3 text-slate-300">{tx.createdAt.toLocaleDateString()} {tx.createdAt.toLocaleTimeString()}</td>
                        <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'DEPOSIT' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                            {tx.type === 'DEPOSIT' ? 'DEPOSIT' : 'WITHDRAW'}
                        </span>
                        </td>
                        <td className="py-3 text-right font-mono">${tx.amount.toFixed(2)}</td>
                    </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}