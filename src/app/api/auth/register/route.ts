import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  businessId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const result = await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role: 'owner',
      businessId: data.businessId,
    });

    if (!result.success || !result.session) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to register account' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.session.user,
      token: result.session.token,
    });

    response.cookies.set({
      name: 'saas_session',
      value: result.session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 86400,
    });

    return response;
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Registration error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
