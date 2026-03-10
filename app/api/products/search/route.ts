export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {searchProducts} from '@/lib/meilisearch';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        // 使用 Meilisearch 进行搜索
        const result = await searchProducts(search, {
            page,
            limit,
        });

        return NextResponse.json({
            success: true,
            data: result.products,
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
        });
    } catch (error) {
        console.error('[api/products/search] Error:', error);
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
