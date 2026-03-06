import {NextResponse} from "next/server";
import {byHash, ensureInit, writeTorrent, writeVolumes} from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
    try {
        await ensureInit();

        // 并行写所有 torrent 文件 + volumes
        await Promise.all([
            ...Array.from(byHash.values()).map((r) => writeTorrent(r)),
            writeVolumes(),
        ]);

        return NextResponse.json({
            success: true,
            message: `已写入 ${byHash.size} 个种子文件`,
        });
    } catch (error: any) {
        return NextResponse.json(
            {success: false, error: error.message},
            {status: 500}
        );
    }
}
