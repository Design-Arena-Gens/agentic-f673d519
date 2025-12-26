import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const tokens = cookieStore.get('youtube_tokens')

  return NextResponse.json({
    authenticated: !!tokens?.value,
  })
}
