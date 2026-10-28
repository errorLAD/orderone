import { NextRequest, NextResponse } from 'next/server';
import { pgQuery } from '@/lib/postgres';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path || [];
    if (pathSegments.length === 0) {
      return new NextResponse('Media not found', { status: 404 });
    }

    const filename = pathSegments[pathSegments.length - 1];
    const folder = pathSegments.length > 1 ? pathSegments[pathSegments.length - 2] : '';

    // 1. Try local filesystem first (development or persistent environments)
    try {
      const localFilePath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments);
      if (fs.existsSync(localFilePath)) {
        const fileBuffer = fs.readFileSync(localFilePath);
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeType =
          ext === 'png'
            ? 'image/png'
            : ext === 'webp'
            ? 'image/webp'
            : ext === 'gif'
            ? 'image/gif'
            : ext === 'svg'
            ? 'image/svg+xml'
            : 'image/jpeg';

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(fileBuffer.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (fsErr) {
      // Ignore filesystem access errors (e.g. read-only serverless environment)
    }

    // 2. Authoritative Database Storage in Supabase public.uploaded_media
    const res = await pgQuery(
      `SELECT mime_type, data, file_size 
       FROM public.uploaded_media 
       WHERE filename = $1 OR (folder = $2 AND filename = $1)
       LIMIT 1`,
      [filename, folder]
    );

    if (res.rows.length > 0) {
      const media = res.rows[0];
      const buffer = Buffer.from(media.data, 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': media.mime_type || 'image/png',
          'Content-Length': String(buffer.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse('Media not found', { status: 404 });
  } catch (error: any) {
    console.error('Error serving uploaded media:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
