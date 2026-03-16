export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {searchBangumi} from '@/lib/meilisearch';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

        const typeParam = searchParams.get('type');
        const type = typeParam ? parseInt(typeParam, 10) : undefined;

        const platformParam = searchParams.get('platform');
        const platform = platformParam ? parseInt(platformParam, 10) : undefined;

        const minScoreParam = searchParams.get('minScore');
        const minScore = minScoreParam ? parseFloat(minScoreParam) : undefined;

        const maxScoreParam = searchParams.get('maxScore');
        const maxScore = maxScoreParam ? parseFloat(maxScoreParam) : undefined;

        const nsfwParam = searchParams.get('nsfw');
        const nsfw = nsfwParam ? nsfwParam === 'true' : undefined;

        const result = await searchBangumi(search, {
            page,
            limit,
            type,
            platform,
            minScore,
            maxScore,
            nsfw,
        });

        return NextResponse.json({
            success: true,
            data: result.subjects,
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
        });
    } catch (error) {
        console.error('[api/bangumi/search] Error:', error);
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}