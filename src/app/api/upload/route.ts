import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { pgQuery } from '@/lib/postgres';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in to upload files' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'products';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    // Validate MIME type
    if (!VALID_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported image format (${file.type}). Allowed formats: JPG, PNG, WEBP, GIF.`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Image size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 5MB limit. Please upload a smaller image.`,
        },
        { status: 400 }
      );
    }

    const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueFilename = `${cleanFolder}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Attempt Supabase Storage Upload if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const bucketName = 'saas-media';
        const storagePath = `${cleanFolder}/${uniqueFilename}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
          if (urlData?.publicUrl) {
            return NextResponse.json({
              success: true,
              url: urlData.publicUrl,
              filename: uniqueFilename,
              storage: 'supabase',
              size: file.size,
              mimeType: file.type,
            });
          }
        }
      } catch (storageErr) {
        console.warn('Supabase Storage upload fallback to local storage:', storageErr);
      }
    }

    // 2. Persist directly to Supabase PostgreSQL uploaded_media table (Safe for Vercel/serverless EROFS)
    const base64Data = buffer.toString('base64');
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await pgQuery(
      `INSERT INTO public.uploaded_media (id, filename, folder, mime_type, file_size, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [mediaId, uniqueFilename, cleanFolder, file.type, file.size, base64Data]
    );

    // 3. Optional local filesystem cache (attempted only if environment permits, silently ignored on EROFS serverless)
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', cleanFolder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const targetFilePath = path.join(uploadDir, uniqueFilename);
      fs.writeFileSync(targetFilePath, buffer);
    } catch (fsErr) {
      // In serverless environments (Vercel, AWS Lambda), filesystem is read-only. Media is safely served via PostgreSQL.
    }

    const publicUrl = `/uploads/${cleanFolder}/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
      storage: 'database',
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error('Image upload API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Image upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 });
    }

    // Delete from Supabase PostgreSQL storage
    const filename = url.split('/').pop();
    if (filename) {
      await pgQuery(`DELETE FROM public.uploaded_media WHERE filename = $1`, [filename]);
    }

    // Attempt deleting from local cache if file exists
    if (url.startsWith('/uploads/')) {
      const relativePath = url.replace(/^\//, '');
      const localFilePath = path.join(process.cwd(), 'public', relativePath);
      try {
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      } catch (e) {
        // Silently ignore filesystem error in read-only environments
      }
    }

    return NextResponse.json({ success: true, message: 'Image removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
