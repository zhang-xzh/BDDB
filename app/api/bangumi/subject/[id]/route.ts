export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getSubjectDetail, getSubjectById} from '@/lib/mongodb/bangumiRepository';

/**
 * Bangumi 条目详情 API
 *
 * 路径参数:
 * - id: 条目 ID
 *
 * 查询参数:
 * - withRelations: 是否包含关联数据 (staff, characters, episodes, relations) (默认 true)
 *
 * 示例:
 * /api/bangumi/subject/62900
 * /api/bangumi/subject/62900?withRelations=false
 */
export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    try {
        const {id} = await params;
        const subjectId = parseInt(id, 10);

        if (isNaN(subjectId)) {
            return NextResponse.json(
                {success: false, error: 'Invalid subject ID'},
                {status: 400},
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const withRelations = searchParams.get('withRelations') !== 'false';

        let subject;

        if (withRelations) {
            // 获取完整详情（含关联数据）
            subject = await getSubjectDetail(subjectId);
        } else {
            // 仅获取基础信息
            subject = await getSubjectById(subjectId);
        }

        if (!subject) {
            return NextResponse.json(
                {success: false, error: 'Subject not found'},
                {status: 404},
            );
        }

        return NextResponse.json({
            success: true,
            data: subject,
        });
    } catch (error) {
        console.error('[api/bangumi/subject] Error:', error);
        return NextResponse.json(
            {success: false, error: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
