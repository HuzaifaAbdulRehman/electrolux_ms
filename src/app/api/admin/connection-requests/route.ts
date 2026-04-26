import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle/db';
import { connectionRequests, workOrders, employees, customers, notifications, users, bills } from '@/lib/drizzle/schema';
import { eq, sql, desc, and, like, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access connection requests
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('[Admin Connection Requests] Fetching requests with filters:', { search, status, page, limit });

    // Build where conditions (DBMS: Dynamic Query Building)
    const whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          like(connectionRequests.applicantName, `%${search}%`),
          like(connectionRequests.applicationNumber, `%${search}%`),
          like(connectionRequests.email, `%${search}%`),
          like(connectionRequests.phone, `%${search}%`)
        )
      );
    }

    if (status !== 'all') {
      whereConditions.push(eq(connectionRequests.status, status as any));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count (DBMS: COUNT with WHERE) - safe fallback
    let totalResult = { count: 0 as number };
    try {
      [totalResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(connectionRequests)
      .where(whereClause);
    } catch (error) {
      console.error('[Admin Connection Requests] Error fetching count:', error);
    }

    // Get connection requests with pagination (DBMS: Complex JOIN) - safe fallback
    let requestsData: any[] = [];
    try {
      requestsData = await db
      .select({
        id: connectionRequests.id,
        applicationNumber: connectionRequests.applicationNumber,
        applicantName: connectionRequests.applicantName,
        fatherName: connectionRequests.fatherName,
        email: connectionRequests.email,
        phone: connectionRequests.phone,
        alternatePhone: connectionRequests.alternatePhone,
        idType: connectionRequests.idType,
        idNumber: connectionRequests.idNumber,
        propertyType: connectionRequests.propertyType,
        propertyAddress: connectionRequests.propertyAddress,
        city: connectionRequests.city,
        state: connectionRequests.state,
        pincode: connectionRequests.pincode,
        landmark: connectionRequests.landmark,
        connectionType: connectionRequests.connectionType,
        loadRequired: connectionRequests.loadRequired,
        purposeOfConnection: connectionRequests.purposeOfConnection,
        zone: connectionRequests.zone,
        status: connectionRequests.status,
        applicationDate: connectionRequests.applicationDate,
        preferredDate: connectionRequests.preferredDate,
        estimatedCharges: connectionRequests.estimatedCharges,
        inspectionDate: connectionRequests.inspectionDate,
        approvalDate: connectionRequests.approvalDate,
        installationDate: connectionRequests.installationDate,
        createdAt: connectionRequests.createdAt,
        updatedAt: connectionRequests.updatedAt
          ,
          // Work order started (employee responded) count
          startedCount: sql<number>`(
            SELECT COUNT(*) FROM work_orders wo
            WHERE wo.work_type = 'new_connection'
              AND (
                wo.description LIKE CONCAT('%', connection_requests.application_number, '%')
                OR wo.title LIKE CONCAT('%', connection_requests.application_number, '%')
              )
              AND (wo.status = 'in_progress' OR wo.status = 'completed')
          )`,
          // Work order completed count (employee finished the work)
          completedCount: sql<number>`(
            SELECT COUNT(*) FROM work_orders wo
            WHERE wo.work_type = 'new_connection'
              AND (
                wo.description LIKE CONCAT('%', connection_requests.application_number, '%')
                OR wo.title LIKE CONCAT('%', connection_requests.application_number, '%')
              )
              AND wo.status = 'completed'
          )`
      })
      .from(connectionRequests)
      .where(whereClause)
      .orderBy(desc(connectionRequests.applicationDate))
      .limit(limit)
      .offset(offset);
    } catch (error) {
      console.error('[Admin Connection Requests] Error fetching requests:', error);
    }

    // Get status counts (DBMS: GROUP BY with COUNT) - safe fallback
    let statusCounts: Array<{ status: string | null; count: number }> = [];
    try {
      statusCounts = await db
      .select({
        status: connectionRequests.status,
        count: sql<number>`COUNT(*)`
      })
      .from(connectionRequests)
      .groupBy(connectionRequests.status);
    } catch (error) {
      console.error('[Admin Connection Requests] Error fetching status counts:', error);
    }

    // Get available employees for assignment - safe fallback
    let availableEmployees: any[] = [];
    try {
      availableEmployees = await db
      .select({
        id: employees.id,
        fullName: employees.employeeName,
        email: employees.email,
        phone: employees.phone,
        department: employees.department,
        workLoad: sql<number>`COALESCE(COUNT(${workOrders.id}), 0)`
      })
      .from(employees)
      .leftJoin(workOrders, and(
        eq(workOrders.employeeId, employees.id),
          (sql`(${workOrders.status} = 'assigned' OR ${workOrders.status} = 'in_progress')` as any)
      ))
      .where(eq(employees.status, 'active'))
      .groupBy(employees.id, employees.employeeName, employees.email, employees.phone, employees.department)
      .orderBy(sql`workLoad ASC`);
    } catch (error) {
      console.error('[Admin Connection Requests] Error fetching employees:', error);
    }

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Format status counts
    const statusStats = statusCounts.reduce((acc, item) => {
      if (item.status) {
        acc[item.status] = item.count;
      }
      return acc;
    }, {} as Record<string, number>);

    console.log('[Admin Connection Requests] Requests fetched successfully:', {
      total,
      returned: requestsData.length,
      page,
      totalPages,
      availableEmployees: availableEmployees.length
    });

    return NextResponse.json({
      success: true,
      data: {
        requests: requestsData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        },
        statusStats,
        availableEmployees
      },
      message: 'Connection requests fetched successfully'
    });

  } catch (error: any) {
    console.error('[Admin Connection Requests] Error fetching requests:', error);
    // Graceful fallback with empty data (keeps UI alive)
    return NextResponse.json({
      success: true,
      data: {
        requests: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        statusStats: {},
        availableEmployees: []
      },
      message: 'No connection requests found'
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action, employeeId, estimatedCharges, inspectionDate, notes, zone } = body;

    console.log('[Admin Connection Requests] Processing action:', { requestId, action, employeeId, zone });

    // Get the connection request
    const [connectionRequest] = await db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.id, requestId))
      .limit(1);

    if (!connectionRequest) {
      return NextResponse.json({
        error: 'Connection request not found'
      }, { status: 404 });
    }

    let updateData: any = {};
    let workOrderData: any = null;
    let customerData: any = null;

    // Handle different actions (DBMS: Conditional Updates)
    switch (action) {
      case 'approve': {
        // Note: Credentials will be generated when customer account is created (after work completion)
        updateData = {
          status: 'approved',
          approvalDate: new Date().toISOString().split('T')[0],
          estimatedCharges: estimatedCharges || connectionRequest.estimatedCharges,
          inspectionDate: inspectionDate || connectionRequest.inspectionDate
        };

        // Create work order only if employeeId provided
        if (employeeId) {
        workOrderData = {
          employeeId: employeeId,
          customerId: null, // Will be set when customer is created
          workType: 'new_connection',
          title: `New Connection Installation - ${connectionRequest.applicationNumber}`,
          description: `Install new ${connectionRequest.connectionType} connection for ${connectionRequest.applicantName}`,
          priority: 'high',
          status: 'assigned',
          assignedDate: new Date().toISOString().split('T')[0],
          dueDate: connectionRequest.preferredDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
          // Notify assigned employee about new work order
          try {
            const [emp] = await db
              .select({ userId: employees.userId, employeeName: employees.employeeName })
              .from(employees)
              .where(eq(employees.id, employeeId))
              .limit(1);
            if (emp?.userId) {
              await db.insert(notifications).values({
                userId: emp.userId,
                notificationType: 'work_order',
                title: 'New Installation Work Order',
                message: `Assigned to install connection for application ${connectionRequest.applicationNumber}.`,
                priority: 'medium',
                actionUrl: '/employee/work-orders',
                actionText: 'View Work Orders',
                isRead: 0
              } as any);
            }
          } catch (e) {
            console.error('[Connection Requests] Employee notification failed:', e);
          }
        }
        break; }

      case 'reject':
        updateData = {
          status: 'rejected',
          completionNotes: notes || 'Request rejected by admin'
        };
        // Notify applicant of rejection (if user exists)
        try {
          const [userWithEmail] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, connectionRequest.email))
            .limit(1);
          if (userWithEmail?.id) {
            await db.insert(notifications).values({
              userId: userWithEmail.id,
              notificationType: 'service',
              title: 'Connection Request Rejected',
              message: `Your application ${connectionRequest.applicationNumber} was rejected. ${notes ? 'Reason: ' + notes : ''}`,
              priority: 'normal',
              actionUrl: '/apply-connection',
              actionText: 'Apply Again',
              isRead: 0
            } as any);
          }
        } catch (e) {
          console.error('[Connection Requests] Applicant rejection notification failed:', e);
        }
        break;

      case 'schedule_inspection':
        updateData = {
          status: 'under_review',
          inspectionDate: inspectionDate,
          estimatedCharges: estimatedCharges
        };
        break;

      case 'create_customer': {
        // DBMS Project: Create customer account from connection request
        // Use the credentials that were already generated during approval
        // Import required modules
        const { generateMeterNumber } = await import('@/lib/utils/meterNumberGenerator');
        const cryptoLib = await import('crypto');
        const bcrypt = await import('bcryptjs');

        // Require a completed work order before activating the account
        try {
          const [woCount] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(workOrders)
            .where(and(
              eq(workOrders.workType, 'new_connection'),
              or(
                like(workOrders.description, `%${connectionRequest.applicationNumber}%`),
                like(workOrders.title, `%${connectionRequest.applicationNumber}%`)
              ),
              eq(workOrders.status, 'completed')
            ));
          if (!woCount || woCount.count === 0) {
            return NextResponse.json({
              error: 'Employee must complete the installation work order before account creation'
            }, { status: 400 });
          }
        } catch (e) {
          console.error('[Connection Request] Work order pre-check failed:', e);
          return NextResponse.json({ error: 'Unable to verify work order assignment' }, { status: 500 });
        }

        // Use stored password from approval, or generate new one if not exists
        let storedPassword = connectionRequest.temporaryPassword;
        let storedAccountNumber = connectionRequest.accountNumber;

        if (!storedPassword) {
          // Generate new password for customer account
          storedPassword = cryptoLib.randomBytes(8).toString('base64').replace(/[/+=]/g, '') +
                          cryptoLib.randomBytes(4).toString('hex').toUpperCase() + '!@#';
          console.log('[Connection Request] Generated new password for customer');
        }

        if (!storedAccountNumber) {
          // Generate new account number
          const randomSuffix = cryptoLib.randomBytes(2).toString('hex').toUpperCase();
          storedAccountNumber = `ELX-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}-${randomSuffix}`;
          console.log('[Connection Request] Generated new account number:', storedAccountNumber);
        }

        const hashedPassword = await bcrypt.hash(storedPassword, 12);

        console.log('[Connection Request] Creating user account for:', connectionRequest.applicantName);
        console.log('[Connection Request] Account Number:', storedAccountNumber);

        // Create user account
        const [newUser] = await db.insert(users).values({
          email: connectionRequest.email,
          password: hashedPassword,
          userType: 'customer',
          name: connectionRequest.applicantName,
          phone: connectionRequest.phone,
          isActive: 1,
        });

        console.log('[Connection Request] User created, creating customer record...');

        // Use the stored account number
        const finalAccountNumber = storedAccountNumber;

        // Generate meter number based on city
        const meterNumber = await generateMeterNumber(connectionRequest.city);
        console.log('[Connection Request] Generated meter number:', meterNumber);

        // Create customer with active status (meter assigned)
        const [newCustomer] = await db.insert(customers).values({
          userId: newUser.insertId,
          accountNumber: finalAccountNumber,
          meterNumber: meterNumber,
          fullName: connectionRequest.applicantName,
          email: connectionRequest.email,
          phone: connectionRequest.phone,
          address: connectionRequest.propertyAddress,
          city: connectionRequest.city,
          state: connectionRequest.state || 'Punjab',
          pincode: connectionRequest.pincode || '00000',
          zone: zone || 'Zone A',
          connectionType: connectionRequest.propertyType,
          status: 'active', // Active since meter is assigned
          connectionDate: new Date().toISOString().split('T')[0],
        } as any);

        const customerId = newCustomer.insertId;
        console.log('[Connection Request] Customer created with ID:', customerId);

        // If there are connection charges, create an initial bill and update outstanding balance
        const connectionFee = Number(connectionRequest.estimatedCharges || 0);
        if (connectionFee > 0) {
          const issueDate = new Date();
          const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          const billingMonth = new Date();

          await db.insert(bills).values({
            customerId: customerId,
            billNumber: `CNX-${String(customerId).padStart(6, '0')}-${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}`,
            billingMonth: billingMonth as any,
            issueDate: issueDate as any,
            dueDate: dueDate as any,
            baseAmount: connectionFee as any,
            fixedCharges: 0 as any,
            electricityDuty: 0 as any,
            gstAmount: 0 as any,
            totalAmount: connectionFee as any,
            unitsConsumed: 0 as any,
            status: 'issued'
          } as any);

          // Update customer's outstanding balance
          await db.update(customers)
            .set({
              outstandingBalance: sql`COALESCE(${customers.outstandingBalance}, 0) + ${connectionFee}` as any,
              lastBillAmount: connectionFee as any
            } as any)
            .where(eq(customers.id, customerId));
        }

        // Update connection request status and save credentials
        updateData = {
          status: 'connected', // Changed to connected since account is active
          approvalDate: new Date().toISOString().split('T')[0],
          installationDate: new Date().toISOString().split('T')[0],
          accountNumber: storedAccountNumber,
          temporaryPassword: storedPassword
        };

        // Find and update work order with customer ID and mark as completed
        await db.update(workOrders)
          .set({
            customerId: customerId,
            status: 'completed',
            completionDate: new Date().toISOString().split('T')[0]
          } as any)
          .where(and(
            eq(workOrders.workType, 'new_connection'),
            or(
              like(workOrders.description, `%${connectionRequest.applicationNumber}%`),
              like(workOrders.title, `%${connectionRequest.applicationNumber}%`)
            )
          ));

        console.log('[Connection Request] Work order completed');

        // Store customer data in response
        customerData = {
          customerId,
          accountNumber: finalAccountNumber,
          meterNumber,
          temporaryPassword: storedPassword,
          email: connectionRequest.email,
          name: connectionRequest.applicantName
        };
        // Notify applicant (if user exists) about account creation
        try {
          const [userWithEmail] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, connectionRequest.email))
            .limit(1);
          if (userWithEmail?.id) {
            await db.insert(notifications).values({
              userId: userWithEmail.id,
              notificationType: 'service',
              title: 'Account Created',
              message: `Your Electrolux account ${finalAccountNumber} has been created. You can log in and view your bills.`,
              priority: 'normal',
              actionUrl: '/login',
              actionText: 'Login',
              isRead: 0
            } as any);
          }
        } catch (e) {
          console.error('[Connection Requests] Applicant notification failed:', e);
        }
        break; }

      case 'complete_installation':
        updateData = {
          status: 'connected',
          installationDate: new Date().toISOString().split('T')[0]
        };
        break;

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }

    // Update connection request (DBMS: UPDATE with WHERE)
    await db
      .update(connectionRequests)
      .set(updateData)
      .where(eq(connectionRequests.id, requestId));

    // Create work order if needed (DBMS: INSERT with Foreign Key)
    let workOrderId = null;
    if (workOrderData && !customerData) { // Only create work order for approve action
      const [workOrder] = await db
        .insert(workOrders)
        .values(workOrderData as any);

      workOrderId = (workOrder as any).insertId;
      console.log('[Admin Connection Requests] Work order created:', workOrderId);
    }

    console.log('[Admin Connection Requests] Request updated successfully:', requestId);

    return NextResponse.json({
      success: true,
      message: action === 'create_customer'
        ? 'Customer account created successfully'
        : `Connection request ${action}ed successfully`,
      data: {
        requestId,
        action,
        workOrderId: workOrderId,
        ...(customerData || {})
      }
    });

  } catch (error: any) {
    console.error('[Admin Connection Requests] Error processing request:', error);
    return NextResponse.json({
      error: 'Failed to process connection request',
      details: error.message
    }, { status: 500 });
  }
}

