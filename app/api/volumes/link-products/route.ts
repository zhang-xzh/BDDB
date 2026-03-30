export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {linkVolumesToProducts} from '@/lib/mongodb';

/**
 * POST /api/volumes/link-products
 * 根据 catalog_no 匹配产品并更新 volume 的 product_ids
 * 查询 suruga_ya.products.attributes.型番 匹配 bddb_volumes.catalog_no
 */
export async function POST(request: NextRequest) {
    try {
        const result = await linkVolumesToProducts();

        return NextResponse.json({
            success: true,
            data: {
                updated: result.updated,
                matched: result.matched,
                skipped: result.skipped,
                details: result.details
            }
        });
    } catch (error) {
        console.error('[API] POST /api/volumes/link-products error:', error);
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500}
        );
    }
}

/**
 * GET /api/volumes/link-products
 * 返回操作说明
 */
export async function GET(request: NextRequest) {
    return NextResponse.json({
        success: true,
        message: 'POST 请求执行产品关联操作',
        description: '根据 catalog_no 匹配 suruga_ya.products.attributes.型番，将匹配的 product._id 填入 bddb_volumes.product_ids'
    });
}
