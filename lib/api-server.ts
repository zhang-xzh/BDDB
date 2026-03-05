import { NextResponse } from 'next/server'

// 使用 Node.js runtime 而不是 Edge Runtime
export const runtime = 'nodejs'

interface FetchResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function successResponse<T>(data: T) {
  return NextResponse.json({ success: true, data: JSON.stringify(data) })
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status })
}
