import { NextRequest, NextResponse } from 'next/server';
import { getAdminTokenFromRequest, logAdminAction, getSuperAdminFromToken } from '@/lib/adminAuth';
import { pgQuery } from '@/lib/postgres';

export async function POST(req: NextRequest) {
  const token = getAdminTokenFromRequest(req);
  if (token) {
    const admin = await getSuperAdminFromToken(token);
    if (admin) {
      await logAdminAction({
        req,
        adminUser: admin.user,
        action: 'admin.logout',
        details: `Super Admin ${admin.user.email} signed out.`,
        targetEntity: 'admin_auth',
      });
    }

    await pgQuery(`DELETE FROM public.sessions WHERE token = $1;`, [token]);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('saas_session');
  return response;
}
