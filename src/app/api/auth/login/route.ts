import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, getUserAuthorizedBusinesses } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const result = await authenticateUser(email, password);

    if (!result.success || !result.session) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.session.user;
    let authorizedBusinesses: any[] = [];
    try {
      authorizedBusinesses = await getUserAuthorizedBusinesses(user);
    } catch (bizErr) {
      console.error('Failed to fetch authorized businesses on login:', bizErr);
    }

    let business = null;
    if (user.businessId) {
      business = authorizedBusinesses.find((b) => b.id === user.businessId) || null;
    }
    if (!business && authorizedBusinesses.length > 0) {
      business = authorizedBusinesses[0];
    }

    const response = NextResponse.json({
      success: true,
      user,
      token: result.session.token,
      business,
      authorizedBusinesses,
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'saas_session',
      value: result.session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 86400, // 30 days
    });

    return response;
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
