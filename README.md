# Intern-Manager Next.js Migration

This directory contains the Next.js App Router production app for the Intern-Manager platform.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database ORM:** Prisma
- **Database:** PostgreSQL (Neon)
- **Authentication:** NextAuth.js (Auth.js)

## Project Structure
```text
next-app/
├── app/
│   ├── api/            # Next.js API Routes (Backend logic)
│   ├── dashboard/      # Protected dashboard views
│   ├── login/          # Public authentication views
│   ├── layout.tsx      # Global layout & Auth Providers wrapper
│   ├── page.tsx        # Entry point (Redirects to dashboard)
├── components/
│   ├── layout/         # Shell components (Sidebar, Navbar)
│   ├── ui/             # Reusable primitive UI components
│   └── features/       # Complex domain components (Forms, Tables)
├── lib/
│   ├── auth.ts         # NextAuth configuration and callbacks
│   └── db.ts           # Prisma client singleton
├── prisma/
│   └── schema.prisma   # Prisma schema
└── middleware.ts       # Route protection logic
```

## Neon Database & Prisma Setup

1. **Create Neon Database**: Go to [Neon.tech](https://neon.tech/) and create a new project.
2. **Copy Connection String**: From the Neon dashboard, copy the PostgreSQL connection string.
3. **Configure Environment Variables**:
   In the `next-app/.env` file, replace the placeholder with your Neon Database URL:
   ```env
   DATABASE_URL="postgresql://[user]:[password]@[neon-hostname]/[dbname]?sslmode=require"
   NEXTAUTH_SECRET="generate_a_random_secret_here"
   NEXTAUTH_URL="http://localhost:3000"
   ```
4. **Push Schema & Generate Prisma Client**:
   Run the following commands inside `next-app/` to migrate the database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

## Installation & Running Locally

1. Navigate to the directory:
   ```bash
   cd next-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

1. **Set Root Directory**: Configure the Vercel project root to `next-app`.
2. **Environment Variables**: Add `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, and `EMAIL_FROM` or `JJ_FROM_EMAIL`.
3. **Build Command**: Use `npm run build`.
4. **Install Command**: Use `npm install`.
5. **Output**: Vercel will deploy the Next.js app directly from `next-app/`.

