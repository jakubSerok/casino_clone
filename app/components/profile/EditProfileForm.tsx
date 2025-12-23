'use client'
import { updateProfile } from "@/actions/profile-actions"
import { useState } from "react"

export function EditProfileForm({ user }: { user: any }) {
    const [msg, setMsg] = useState("")

    return (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-full">
             <h2 className="text-xl font-bold mb-4 text-white">Edytuj Profil</h2>
             <form action={async (formData) => {
                 const res = await updateProfile(formData)
                 if(res.success) setMsg("Zapisano!")
                 if(res.error) setMsg(res.error)
             }} className="space-y-4">
                <div>
                    <label className="text-slate-400 text-sm">Username</label>
                    <input name="username" defaultValue={user.username} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                    <label className="text-slate-400 text-sm">Email</label>
                    <input name="email" defaultValue={user.email} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                    <label className="text-slate-400 text-sm">New password (optional)</label>
                    <input name="password" type="password" placeholder="******" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-bold">Save changes</button>
                {msg && <p className="text-center text-purple-400 text-sm">{msg}</p>}
             </form>
        </div>
    )
}