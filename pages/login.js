import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://rgomassenger.vercel.app/auth/callback'
      }
    })

    if (error) {
      alert(error.message)
    } else {
      alert('ইমেইলে লগইন লিংক/OTP পাঠানো হয়েছে')
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={signIn} disabled={loading}>
        {loading ? 'Sending...' : 'Send OTP'}
      </button>
    </div>
  )
}
