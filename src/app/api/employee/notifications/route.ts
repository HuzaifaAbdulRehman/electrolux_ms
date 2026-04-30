import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { notifications, employees } from '@/lib/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// GET /api/employee/notifications - Get notifications for current employee
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only employees can access this endpoint
    if (session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden - Employee access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get employee's user ID
    const userId = parseInt(session.user.id);

    console.log('[Employee Notifications API] Fetching notifications for employee:', userId);

    // Build query for employee notifications
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

    // Apply filters
    if (filter === 'unread') {
      query = query.where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0)
      ));
    } else if (filter !== 'all') {
      // Filter by notification type
      query = query.where(and(
        eq(notifications.userId, userId),
        eq(notifications.notificationType, filter as any)
      ));
    }

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

    console.log('[Employee Notifications API] Found', transformedNotifications.length, 'notifications');

    return NextResponse.json({
      success: true,
      data: transformedNotifications,
      message: 'Employee notifications fetched successfully'
    });

  } catch (error) {
    console.error('[Employee Notifications API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch employee notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH /api/employee/notifications - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, markAllRead } = body;

    const userId = parseInt(session.user.id);

    if (markAllRead) {
      // Mark all notifications as read for this employee
      await db
        .update(notifications)
        .set({
          isRead: 1,
          readAt: new Date()
        })
        .where(eq(notifications.userId, userId));

      return NextResponse.json({
        success: true,
        message: 'All employee notifications marked as read',
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
      message: 'Employee notification marked as read',
    });

  } catch (error) {
    console.error('[Employee Notifications API] Error updating notification:', error);
    return NextResponse.json({ 
      error: 'Failed to update employee notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/employee/notifications - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    // Delete notification (only if it belongs to the employee)
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, parseInt(id)),
        eq(notifications.userId, userId)
      ));

    return NextResponse.json({
      success: true,
      message: 'Employee notification deleted',
    });

  } catch (error) {
    console.error('[Employee Notifications API] Error deleting notification:', error);
    return NextResponse.json({ 
      error: 'Failed to delete employee notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to format time ago
function formatTime(date: Date | null): string {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return new Date(date).toLocaleDateString();
}

