import { mysqlTable, varchar, timestamp, int, decimal, date, text, mysqlEnum } from 'drizzle-orm/mysql-core';
import { customers } from './customers';

export const connectionApplications = mysqlTable('connection_applications', {
  id: int('id').primaryKey().autoincrement(),
  applicationNumber: varchar('application_number', { length: 50 }).notNull().unique(), // APP-2024-XXXXXX
  customerId: int('customer_id').references(() => customers.id), // NULL for new applicants

  // Applicant information
  applicantName: varchar('applicant_name', { length: 255 }).notNull(),
  fatherName: varchar('father_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  alternatePhone: varchar('alternate_phone', { length: 20 }),

  // Identity verification
  idType: mysqlEnum('id_type', ['passport', 'drivers_license', 'national_id', 'voter_id', 'aadhaar']).notNull(),
  idNumber: varchar('id_number', { length: 100 }).notNull(),

  // Connection details
  propertyType: mysqlEnum('property_type', ['Residential', 'Commercial', 'Industrial', 'Agricultural']).notNull(),
  connectionType: mysqlEnum('connection_type', ['single-phase', 'three-phase', 'industrial']).notNull(),
  loadRequired: decimal('load_required', { precision: 10, scale: 2 }), // kW (Optional - determined during inspection)

  // Address
  propertyAddress: varchar('property_address', { length: 500 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  landmark: varchar('landmark', { length: 255 }),

  // Application details
  preferredConnectionDate: date('preferred_connection_date'),
  purposeOfConnection: mysqlEnum('purpose_of_connection', ['domestic', 'business', 'industrial', 'agricultural']).notNull(),
  existingConnection: int('existing_connection').default(0).notNull(), // 0 = no, 1 = yes
  existingAccountNumber: varchar('existing_account_number', { length: 50 }),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'under_inspection', 'connected']).default('pending').notNull(),

  // Financial
  estimatedCharges: decimal('estimated_charges', { precision: 10, scale: 2 }),
  applicationFeePaid: int('application_fee_paid').default(0).notNull(), // 0 = no, 1 = yes

  // Documents
  identityProofPath: varchar('identity_proof_path', { length: 500 }),
  addressProofPath: varchar('address_proof_path', { length: 500 }),
  propertyProofPath: varchar('property_proof_path', { length: 500 }),

  // Processing
  siteInspectionDate: date('site_inspection_date'),
  estimatedConnectionDays: int('estimated_connection_days'),
  rejectionReason: text('rejection_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type ConnectionApplication = typeof connectionApplications.$inferSelect;
export type NewConnectionApplication = typeof connectionApplications.$inferInsert;

