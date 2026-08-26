import { pushPublicKey } from '@/lib/push'
import { NextResponse } from 'next/server'

/** Expose the VAPID public key so clients can subscribe to web push. */
export async function GET() {
  const key = pushPublicKey()
  if (!key) {
    return NextResponse.json({ error: 'Push notifications are not configured' }, { status: 501 })
  }
  return NextResponse.json({ publicKey: key })
}
