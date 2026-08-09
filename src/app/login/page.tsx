"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser, logoutUser } from "@/lib/auth";
import { clearPinUnlocked, isAllowedEmail } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);
    clearPinUnlocked();

    try {
      const credential = await loginUser(email.trim(), password);

      if (!isAllowedEmail(credential.user.email)) {
        await logoutUser().catch(() => undefined);
        setError("This account is not allowed to enter Khushi.");
        return;
      }

      router.replace("/pin");
    } catch (error: any) {
      console.error("Login failed:", error);

      switch (error?.code) {
        case "auth/invalid-credential":
          setError("Incorrect email or password.");
          break;
        case "auth/user-not-found":
          setError("No account exists with this email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later.");
          break;
        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <div className="login-polka-bg" />
      <div className="login-gradient" />

      <section className="login-card" aria-labelledby="login-title">
        {/* <div className="login-icon-wrapper">
          <img
            src="/characters/aadi.png"
            alt="Khushi"
            className="login-icon-image"
          />
        </div> */}
        <div className="settings-avatars">

            <div className="settings-avatar settings-avatar-ammu">
              <img
                src="/characters/ammu.png"
                alt="Ammu"
              />
            </div>

            <div className="settings-avatar settings-avatar-aadi">
              <img
                src="/characters/aadi.png"
                alt="Aadi"
              />
            </div>

          </div>

        <h1 id="login-title" className="login-title">Khushi</h1>

        <p className="login-subtitle">
          Welcome back! Enter your details to continue.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-input-wrapper">
            <span
              className="material-symbols-outlined login-input-icon"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mail
            </span>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="login-input"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={loading}
            />
          </div>

          <div className="login-input-wrapper">
            <span
              className="material-symbols-outlined login-input-icon"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </span>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="login-input login-password-input"
              autoComplete="current-password"
              required
              disabled={loading}
            />

            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings: showPassword
                    ? "'FILL' 1"
                    : "'FILL' 0",
                }}
              >
                {showPassword ? "visibility" : "visibility_off"}
              </span>
            </button>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-enter-button"
            disabled={loading}
          >
            {loading ? "Entering..." : "Enter"}
          </button>
        </form>
      </section>
    </main>
  );
}
