export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getMongoCollection } from '@/lib/mongodb/connection';
import type { BddbWork } from '@/lib/mongodb/bddbRepository';

/**
 * GET /api/bangumi/works
 * 获取所有作品列表（用于可视化页面）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') ?? '1000', 10);
    const skip = parseInt(searchParams.get('skip') ?? '0', 10);

    const collection = getMongoCollection<BddbWork>('bddb_works');
    const works = await collection
      .find({})
      .sort({ rank: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // 转换 ObjectId 为字符串
    const result = works.map((work) => ({
      ...work,
      _id: work._id.toString(),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] GET /api/bangumi/works error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch works' },
      { status: 500 }
    );
  }
}
