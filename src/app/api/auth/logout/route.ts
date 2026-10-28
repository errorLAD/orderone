import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (token) {
    await destroySession(token);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('saas_session');
  return response;
}
