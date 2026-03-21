import {NextRequest, NextResponse} from "next/server";
import {clearAllData} from "@/lib/mongodb";
import {syncTorrentsFromQb} from "@/lib/qb";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        await clearAllData();
        const result = await syncTorrentsFromQb();

        return NextResponse.json({success: true, data: {message: "数据已完全重建", ...result}});
    } catch (error: any) {
        return NextResponse.json(
            {success: false, error: error.message},
            {status: 500}
        );
    }
}
