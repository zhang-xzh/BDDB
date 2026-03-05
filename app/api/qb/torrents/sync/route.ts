import { NextResponse } from 'next/server'
import { syncTorrentsFromQb } from '@/lib/qb'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const result = await syncTorrentsFromQb()
    return NextResponse.json(result.success
      ? { success: true, data: 'synced' }
      : { success: false, error: result.error })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
