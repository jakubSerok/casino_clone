import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { db } from "@/lib/db"

export default async function Navbar() {
  const session = await getServerSession(authOptions)
  
  let balance = 0;
  if (session?.user?.email) {
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { balance: true }
    });
    balance = user?.balance || 0;
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-950 p-4 text-white flex justify-between items-center">
      <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Kasyno
      </Link>

      <div className="flex gap-4 items-center">
        {session ? (
          <>
            <div className="bg-slate-900 px-3 py-1 rounded border border-slate-800 text-green-400 font-mono">
              ${balance.toFixed(2)}
            </div>
            <Link href="/profile" className="hover:text-purple-400">Profil</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="text-slate-300 hover:text-white">Logowanie</Link>
            <Link href="/register" className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700">Rejestracja</Link>
          </>
        )}
      </div>
    </nav>
  )
}