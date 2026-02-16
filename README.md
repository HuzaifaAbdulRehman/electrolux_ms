# Electrolux Energy Management System (EMS)

A full-stack web-based application designed to digitize and streamline electricity utility management operations. The system provides role-based portals for customers, employees, and administrators to manage billing, meter readings, complaints, connection requests, and reporting.

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Database:** MySQL 8.0
- **ORM:** Drizzle ORM
- **Auth:** NextAuth v4 + bcryptjs
- **Styling:** Tailwind CSS

## Project Structure

```
src/
  app/              # Next.js App Router pages
  lib/
    drizzle/
      db.ts         # Database connection
      schema/       # Table definitions
    auth.ts         # NextAuth configuration
```

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your credentials
3. Create the database:
   ```sql
   CREATE DATABASE electricity_ems;
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Push schema to database:
   ```bash
   npm run db:push
   ```
6. Start dev server:
   ```bash
   npm run dev
   ```

## Team

| Name | Roll Number |
|------|-------------|
| Huzaifa Abdul Rehman | 23K-0782 |
| Muhammad Abdullah Khan | 23K-0607 |
| Abdul Moiz Hussain | 23K-0553 |

**Course:** CS3009 Software Engineering — FAST-NUCES Karachi, Spring 2026
