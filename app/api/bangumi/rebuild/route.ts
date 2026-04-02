import {NextResponse} from 'next/server'
import {exec} from 'child_process'
import {promisify} from 'util'

export const runtime = 'nodejs'

const execAsync = promisify(exec)

export async function POST() {
    try {
        const {stdout, stderr} = await execAsync('npx tsx scripts/syncBangumiMeili.ts rebuild', {
            cwd: process.cwd(),
            timeout: 600000, // 10分钟
        })

        return NextResponse.json({
            success: true,
            data: stdout || 'completed',
            stderr: stderr || undefined,
        })
    } catch (error: any) {
        console.error('[API] bangumi rebuild error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Rebuild failed',
            stderr: error.stderr,
            stdout: error.stdout,
        }, {status: 500})
    }
}
