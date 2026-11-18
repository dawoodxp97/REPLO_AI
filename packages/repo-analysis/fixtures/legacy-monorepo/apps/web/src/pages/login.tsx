import { useState } from 'react'
import { Button } from '../components/button'
import { useSession } from '../store/session'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const signIn = useSession((state) => state.signIn)
  return (
    <form>
      <input value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button label="Sign in" onClick={() => signIn(email)} />
    </form>
  )
}
