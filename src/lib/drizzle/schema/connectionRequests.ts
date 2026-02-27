import { mysqlTable, varchar, int, date, text, timestamp, mysqlEnum, decimal, boolean, index } from 'drizzle-orm/mysql-core';

export const connectionRequests = mysqlTable('connection_requests', {
  id: int('id').autoincrement().primaryKey(),
  applicationNumber: varchar('application_number', { length: 50 }).notNull().unique(),
  applicantName: varchar('applicant_name', { length: 255 }).notNull(),
  fatherName: varchar('father_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  alternatePhone: varchar('alternate_phone', { length: 20 }),
  idType: mysqlEnum('id_type', ['passport', 'drivers_license', 'national_id', 'voter_id', 'aadhaar']).notNull(),
  idNumber: varchar('id_number', { length: 100 }).notNull(),
  propertyType: mysqlEnum('property_type', ['Residential', 'Commercial', 'Industrial', 'Agricultural']).notNull(),
  connectionType: mysqlEnum('connection_type', ['single-phase', 'three-phase', 'industrial']).notNull(),
  loadRequired: decimal('load_required', { precision: 10, scale: 2 }),
  propertyAddress: varchar('property_address', { length: 500 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  pincode: varchar('pincode', { length: 10 }),
  landmark: varchar('landmark', { length: 255 }),
  zone: varchar('zone', { length: 50 }),
  preferredDate: date('preferred_date'),
  purposeOfConnection: mysqlEnum('purpose_of_connection', ['domestic', 'business', 'industrial', 'agricultural']).notNull(),
  existingConnection: boolean('existing_connection').default(false),
  existingAccountNumber: varchar('existing_account_number', { length: 50 }),
  status: mysqlEnum('status', ['pending', 'under_review', 'approved', 'rejected', 'connected']).default('pending'),
  estimatedCharges: decimal('estimated_charges', { precision: 10, scale: 2 }),
  inspectionDate: date('inspection_date'),
  approvalDate: date('approval_date'),
  installationDate: date('installation_date'),
  applicationDate: date('application_date').notNull(),
  // Account credentials - set when application is approved
  accountNumber: varchar('account_number', { length: 50 }), // Generated when approved
  temporaryPassword: varchar('temporary_password', { length: 255 }), // Shown to customer via track page
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    statusIdx: index('idx_status').on(table.status),
    emailIdx: index('idx_email').on(table.email),
  };
});

// Type exports
export type ConnectionRequest = typeof connectionRequests.$inferSelect;
export type NewConnectionRequest = typeof connectionRequests.$inferInsert;

