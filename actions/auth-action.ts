"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    username: z.string().min(3)
})

export async function registerUser(
  prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const username = formData.get("username") as string

    const validatedFields = RegisterSchema.safeParse({
      email,
      password,
      username,
    })

    if (!validatedFields.success) {
      return { error: "Invalid data provided!" }
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) return { error: "Email already in use!" }

    const hashedPassword = await bcrypt.hash(password, 10)

    await db.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        balance: 50.0,
      },
    })

    return { success: "Account created successfully! You can now log in." }
  } catch (error) {
    console.error("Registration error:", error)
    return { error: "An error occurred during registration. Please try again." }
  }
}