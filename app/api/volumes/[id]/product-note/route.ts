export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getVolumeById} from '@/lib/mongodb/bddbRepository';
import {getProductsCollection, MongoProduct} from '@/lib/mongodb/productRepository';

/**
 * 获取 volume 关联的 product 的 note 字段
 * 使用 product_ids 的第一个值查询 suruga_ya.products 集合
 */
export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const {id: volumeId} = await params;

        // 1. 获取 volume 信息，提取 product_ids
        const volume = await getVolumeById(volumeId);
        if (!volume) {
            return NextResponse.json(
                {success: false, error: 'Volume not found'},
                {status: 404}
            );
        }

        // 2. 检查 product_ids，取第一个
        const productIds = volume.product_ids;
        if (!productIds || productIds.length === 0) {
            return NextResponse.json(
                {success: false, error: 'No product_ids found for this volume'},
                {status: 404}
            );
        }

        const firstProductId = productIds[0];

        // 3. 从 suruga_ya.products 查询 note 字段
        const productsCollection = getProductsCollection();
        const product = await productsCollection.findOne(
            {_id: firstProductId},
            {projection: {note: 1, title: 1, product_id: 1}}
        ) as MongoProduct & { note?: unknown } | null;

        if (!product) {
            return NextResponse.json(
                {success: false, error: 'Product not found'},
                {status: 404}
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                product_id: product.product_id,
                title: product.title,
                note: product.note ?? null,
            },
        });
    } catch (error) {
        console.error('[api/volumes/product-note] Error:', error);
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500}
        );
    }
}
