import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/drizzle/db';
import { users, customers, employees } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      userType: 'admin' | 'employee' | 'customer';
      // Additional fields based on user type
      customerId?: number;
      employeeId?: number;
      accountNumber?: string;
      meterNumber?: string;
      requiresPasswordChange?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    userType: 'admin' | 'employee' | 'customer';
    customerId?: number;
    employeeId?: number;
    accountNumber?: string;
    meterNumber?: string;
    requiresPasswordChange?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    userType: 'admin' | 'employee' | 'customer';
    customerId?: number;
    employeeId?: number;
    accountNumber?: string;
    meterNumber?: string;
    requiresPasswordChange?: number;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        // Find user in database
        const userResults = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        const user = userResults[0];

        if (!user || user.isActive !== 1) {
          throw new Error('User not found or inactive');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        // Get additional user data based on user type
        let additionalData = {};

        if (user.userType === 'customer') {
          const customerResults = await db
            .select({
              customerId: customers.id,
              accountNumber: customers.accountNumber,
              meterNumber: customers.meterNumber,
            })
            .from(customers)
            .where(eq(customers.userId, user.id))
            .limit(1);

          if (customerResults[0]) {
            additionalData = {
              customerId: customerResults[0].customerId,
              accountNumber: customerResults[0].accountNumber,
              meterNumber: customerResults[0].meterNumber,
            };
          }
        } else if (user.userType === 'employee') {
          const employeeResults = await db
            .select({
              employeeId: employees.id,
            })
            .from(employees)
            .where(eq(employees.userId, user.id))
            .limit(1);

          if (employeeResults[0]) {
            additionalData = {
              employeeId: employeeResults[0].employeeId,
            };
          }
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          userType: user.userType,
          requiresPasswordChange: user.requiresPasswordChange,
          ...additionalData,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.userType = user.userType;
        token.customerId = user.customerId;
        token.employeeId = user.employeeId;
        token.accountNumber = user.accountNumber;
        token.meterNumber = user.meterNumber;
        token.requiresPasswordChange = user.requiresPasswordChange;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.userType = token.userType as 'admin' | 'employee' | 'customer';
        session.user.customerId = token.customerId as number | undefined;
        session.user.employeeId = token.employeeId as number | undefined;
        session.user.accountNumber = token.accountNumber as string | undefined;
        session.user.meterNumber = token.meterNumber as string | undefined;
        session.user.requiresPasswordChange = token.requiresPasswordChange as number | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

