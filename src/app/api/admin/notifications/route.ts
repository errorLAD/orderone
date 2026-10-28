import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { 
  getAdminNotifications, 
  markAdminNotificationRead, 
  markAllAdminNotificationsRead,
  deleteAdminNotification,
  clearAllReadAdminNotifications 
} from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const notifications = await getAdminNotifications(unreadOnly);
    return NextResponse.json({ success: true, notifications });
  } catch (err: any) {
    console.error('Admin notifications GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    if (body.markAllRead) {
      await markAllAdminNotificationsRead();
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    const { notificationId } = body;
    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'Notification ID or markAllRead flag required' }, { status: 400 });
    }

    await markAdminNotificationRead(notificationId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin notifications POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    if (body.clearRead) {
      await clearAllReadAdminNotifications();
      return NextResponse.json({ success: true, message: 'All read notifications cleared' });
    }

    const { notificationId } = body;
    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'Notification ID or clearRead flag required' }, { status: 400 });
    }

    await deleteAdminNotification(notificationId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin notifications DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
