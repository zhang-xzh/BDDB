export const runtime = 'nodejs';

import {NextRequest, NextResponse} from 'next/server';
import {getSubjectDetail, getSubjectById} from '@/lib/mongodb/bangumiRepository';

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

        const subject = withRelations
            ? await getSubjectDetail(subjectId)
            : await getSubjectById(subjectId);

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