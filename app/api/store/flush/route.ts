import {NextResponse} from "next/server";

export const runtime = "nodejs";

export async function POST() {
    // SQLite WAL checkpoint 不再需要，MongoDB 自动持久化
    return NextResponse.json({success: true, message: 'No-op: MongoDB handles persistence automatically'});
}
