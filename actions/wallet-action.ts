'use server'

import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function processTransaction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return { error: "Musisz być zalogowany" }

  const amount = parseFloat(formData.get("amount") as string)
  const type = formData.get("type") as "DEPOSIT" | "WITHDRAW"

  if (isNaN(amount) || amount <= 0) return { error: "Nieprawidłowa kwota" }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return { error: "Użytkownik nie istnieje" }

  try {
    await db.$transaction(async (tx) => {
      if (type === "WITHDRAW") {
        if (user.balance < amount) {
          throw new Error("Niewystarczające środki")
        }
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: amount } }
        })
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: amount } }
        })
      }

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type,
          status: "COMPLETED"
        }
      })
    })

    revalidatePath("/profile") 
    return { success: `Transakcja ${type === 'DEPOSIT' ? 'wpłaty' : 'wypłaty'} zakończona pomyślnie!` }
  } catch (error: any) {
    return { error: error.message || "Błąd transakcji" }
  }
}