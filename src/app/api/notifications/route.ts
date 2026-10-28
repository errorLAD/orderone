import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { OrderSourceType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const sourceType = searchParams.get('sourceType') as OrderSourceType | null;

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
    }

    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const notifications = await getNotifications(businessId, sourceType || undefined);
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, businessId, markAll } = body;

    if (markAll && businessId) {
      const isAuth = await isUserAuthorizedForBusiness(user, businessId);
      if (!isAuth) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      await markAllNotificationsAsRead(businessId);
      return NextResponse.json({ success: true, message: 'All marked as read' });
    }

    if (notificationId) {
      const ok = await markNotificationAsRead(notificationId);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ success: false, error: 'Invalid request parameters' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
