export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {queryProducts} from '@/lib/mongodb/productRepository';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        const result = await queryProducts({
            search,
            page,
            limit,
        });

        // 转换 ObjectId 为字符串
        const products = result.products.map(p => ({
            ...p,
            _id: p._id.toString(),
        }));

        return NextResponse.json({
            success: true,
            data: products,
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
        });
    } catch (error) {
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
