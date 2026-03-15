import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { notifications, users } from '@/lib/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all'; // all, unread, billing, payment, etc.
    const limit = parseInt(searchParams.get('limit') || '50');
    const countOnly = searchParams.get('countOnly') === 'true';

    // Get user ID
    const userId = parseInt(session.user.id);

    // If only count requested, return unread count
    if (countOnly) {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, 0)
        )) as any;

      return NextResponse.json({
        success: true,
        unreadCount: Number(result?.count || 0),
      });
    }

    // Build query
    let query = db
      .select({
        id: notifications.id,
        type: notifications.notificationType,
        title: notifications.title,
        message: notifications.message,
        priority: notifications.priority,
        actionUrl: notifications.actionUrl,
        actionText: notifications.actionText,
        read: notifications.isRead,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .$dynamic();

    // Apply additional filters (userId already filtered above)
    const conditions = [eq(notifications.userId, userId)];

    if (filter === 'unread') {
      conditions.push(eq(notifications.isRead, 0));
    } else if (filter !== 'all') {
      // Filter by notification type
      conditions.push(eq(notifications.notificationType, filter as any));
    }

    query = query.where(and(...conditions) as any);

    // Order by most recent first and limit
    query = query.orderBy(desc(notifications.createdAt)).limit(limit);

    const result = await query;

    // Transform data to match frontend expectations
    const transformedNotifications = result.map(notif => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      priority: notif.priority || 'normal',
      actionUrl: notif.actionUrl || '#',
      actionText: notif.actionText || 'View',
      read: notif.read === 1,
      time: formatTime(notif.createdAt),
      date: notif.createdAt ? new Date(notif.createdAt).toISOString().split('T')[0] : '',
    }));

    return NextResponse.json({
      success: true,
      data: transformedNotifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PATCH /api/notifications/:id - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, markAllRead } = body;

    const userId = parseInt(session.user.id);

    if (markAllRead) {
      // Mark all notifications as read
      await db
        .update(notifications)
        .set({
          isRead: 1,
          readAt: new Date()
        })
        .where(eq(notifications.userId, userId));

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Mark single notification as read
    await db
      .update(notifications)
      .set({
        isRead: 1,
        readAt: new Date()
      })
      .where(and(
        eq(notifications.id, parseInt(id)),
        eq(notifications.userId, userId)
      ));

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/notifications/:id - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    // Delete notification (only if it belongs to the user)
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, parseInt(id)),
        eq(notifications.userId, userId)
      ));

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}

// Helper function to format time ago
function formatTime(date: Date | null): string {
  if (!date) return 'Unknown';

  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffMs / 604800000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  return notifDate.toLocaleDateString();
}

