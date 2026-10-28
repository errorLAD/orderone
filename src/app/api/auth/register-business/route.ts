import { NextRequest, NextResponse } from 'next/server';
import { registerBusinessOwner } from '@/lib/auth';
import { z } from 'zod';
import { BusinessType } from '@/types';
import { normalizeCategoryKey } from '@/lib/categories';

const registerBusinessSchema = z.object({
  businessName: z.string().min(2, 'Business / Brand name must be at least 2 characters'),
  category: z.string().min(1, 'Business category is required'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid mobile / WhatsApp number'),
  address: z.string().min(3, 'Please enter your business address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerBusinessSchema.parse(body);
    const normalizedCategory = normalizeCategoryKey(data.category);

    const result = await registerBusinessOwner({
      businessName: data.businessName,
      category: normalizedCategory,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      password: data.password,
    });

    if (!result.success || !result.session || !result.business) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to register business' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.session.user,
      business: result.business,
      token: result.session.token,
      nextUrl: '/onboarding',
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
    console.error('register-business API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
