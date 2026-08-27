import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('whatsapp_number')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      whatsappNumber: settings?.whatsapp_number || null,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const rawNumber = body?.whatsappNumber

    if (rawNumber === null || rawNumber === '') {
      // Clear number
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          whatsapp_number: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, whatsappNumber: null })
    }

    if (typeof rawNumber !== 'string') {
      return NextResponse.json({ error: 'Phone number must be a string' }, { status: 400 })
    }

    // Clean number to E.164-like format: only keep digits and leading +
    const cleaned = rawNumber.trim().replace(/[^\d+]/g, '')
    const digitsOnly = cleaned.replace(/\D/g, '')

    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number with country code (e.g. +1 555 123 4567 or +91 98765 43210)' },
        { status: 400 },
      )
    }

    const finalNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`

    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          whatsapp_number: finalNumber,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      whatsappNumber: finalNumber,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        whatsapp_number: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, whatsappNumber: null })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
