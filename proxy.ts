import { withAuth } from "next-auth/middleware";

// More on how NextAuth.js middleware works: https://next-auth.js.org/configuration/nextjs#middleware
export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      // `/` is public but we can require auth for any specific route.
      // E.g. require auth for /dashboard
      const path = req.nextUrl.pathname;
      if (path.startsWith("/dashboard") || path.startsWith("/tasks") || path.startsWith("/projects")) {
        return !!token;
      }
      return true;
    },
  },
});

export const config = { matcher: ["/dashboard/:path*", "/tasks/:path*", "/projects/:path*"] };
