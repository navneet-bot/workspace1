"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (res?.error) {
      setError("Invalid credentials. Please try again.");
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      router.push(callbackUrl);
    }
  };

  return (
    <div id="loginPage">
      <div className="login-bg" />
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">JJ</div>
          <span>Job <em>Jockey</em></span>
        </div>
        <h2>Welcome back</h2>
        <p>Sign in to your account</p>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="mb-4 rounded-lg bg-jj-red/10 border border-jj-red/20 p-3 text-sm text-jj-red" style={{ position: "relative", zIndex: 5 }}>
              {error}
            </div>
          )}

          <div className="field-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              placeholder="yourname@jobjockey.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>Password</label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? "Signing in..." : "Sign In →"}
          </button>

          <p className="domain-note">
            Only <span>@jobjockey.in</span> emails are allowed
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-jj-bg" />}>
      <LoginForm />
    </Suspense>
  );
}
