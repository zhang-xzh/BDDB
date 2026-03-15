export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {searchBangumi} from '@/lib/meilisearch';

/**
 * Bangumi 条目搜索 API
 *
 * 查询参数:
 * - search: 搜索关键词
 * - page: 页码 (默认 1)
 * - limit: 每页数量 (默认 20)
 * - type: 条目类型筛选 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元)
 * - platform: 平台类型筛选
 * - minScore: 最低评分筛选
 * - maxScore: 最高评分筛选
 * - nsfw: 是否包含 NSFW 内容 (true/false)
 *
 * 示例:
 * /api/bangumi/search?search=西部旷野&type=2&page=1&limit=10
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        // 基础参数
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // 最大 100

        // 过滤参数
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

        // 使用 Meilisearch 进行搜索
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
