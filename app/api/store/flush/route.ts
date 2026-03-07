import {NextResponse} from "next/server";
import {getDb} from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
    try {
        // SQLite (WAL 模式) 写入即时持久，checkpoint 可将 WAL 合并回主库
        getDb().pragma('wal_checkpoint(PASSIVE)');
        return NextResponse.json({success: true, message: 'WAL checkpoint complete'});
    } catch (error: any) {
        return NextResponse.json({success: false, error: error.message}, {status: 500});
    }
}
