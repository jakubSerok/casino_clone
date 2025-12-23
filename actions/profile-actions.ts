'use server'

import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { z } from "zod"


const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    username: z.string().min(3)
})
export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return { error: "Brak autoryzacji" }

  const newUsername = formData.get("username") as string
  const newEmail = formData.get("email") as string
  const newPassword = formData.get("password") as string

  const validatedFields = RegisterSchema.safeParse({
      newEmail,
      newPassword,
      newUsername,
    })
      if (!validatedFields.success) {
      return { error: "Invalid data provided!" }
    }

  try {
    const dataToUpdate: any = {}

    if (newUsername) dataToUpdate.username = newUsername
    
    if (newEmail && newEmail !== session.user.email) {
      const exists = await db.user.findUnique({ where: { email: newEmail } })
      if (exists) return { error: "Email jest już zajęty" }
      dataToUpdate.email = newEmail
    }

    if (newPassword ) {
      dataToUpdate.password = await bcrypt.hash(newPassword, 10)
    } 

    await db.user.update({
      where: { email: session.user.email },
      data: dataToUpdate
    })

    revalidatePath("/profile")
    return { success: "Profil zaktualizowany" }
  } catch (error) {
    return { error: "Błąd aktualizacji danych" }
  }
}