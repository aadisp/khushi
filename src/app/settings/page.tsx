"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { hasPin } from "@/lib/auth";
import { clearPinUnlocked, isAllowedEmail, isPinUnlocked } from "@/lib/session";

export default function SettingsPage() {
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [ready, setReady] = useState(false);

  const [currentEmail, setCurrentEmail] = useState<string | null>(
    null
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const email = user.email.toLowerCase();

      if (!isAllowedEmail(email)) {
        router.replace("/login");
        return;
      }

      try {
        if (!(await hasPin())) {
          router.replace("/set-pin");
          return;
        }

        if (!isPinUnlocked(user.uid)) {
          router.replace("/pin");
          return;
        }
      } catch (error) {
        console.error("Settings authentication check failed:", error);
        router.replace("/login");
        return;
      }

      setCurrentEmail(email);
      setReady(true);
    });

    return () => unsubscribe();
  }, [router]);

  const isAadi =
    currentEmail === "spaadi1601@gmail.com";

  const currentAvatar = isAadi
    ? "/characters/aadi.png"
    : "/characters/ammu.png";

  if (!ready) {
    return (
      <main className="app-loading">
        <div className="app-loading-heart">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            settings
          </span>
        </div>
        <p>Opening your settings...</p>
      </main>
    );
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await signOut(auth);
      clearPinUnlocked();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
      alert("Could not log out. Please try again.");
    }
  };

  return (
    <main className="settings-screen">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="settings-header">
        <div className="settings-header-inner">

          <div className="settings-header-profile">
            <img
              src={currentAvatar}
              alt={isAadi ? "Aadi" : "Ammu"}
              onClick={() => router.push("/")}
            />
          </div>

          <h1>Settings</h1>

          <span
            className="material-symbols-outlined settings-header-heart"
            style={{
              fontVariationSettings:
                "'FILL' 1",
            }}
          >
            settings
          </span>

        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="settings-content">

        {/* Profile */}
        <section className="settings-profile">

          <div className="settings-profile-glow" />

          <div className="settings-avatars">

            <div className="settings-avatar settings-avatar-ammu">
              <img
                src={currentAvatar}
                alt={isAadi ? "Aadi" : "Ammu"}
              />
            </div>
          </div>

          <div className="settings-profile-text">

            <h2>
              {isAadi ? "Aadi" : "Ammu"}
            </h2>

            <div className="settings-premium-badge">
              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings:
                    "'FILL' 1",
                }}
              >
                favorite
              </span>

            </div>

          </div>

        </section>

        {/* =================================================
            SETTINGS OPTIONS
        ================================================= */}

        <section className="settings-options">

          {/* Change PIN */}
          <button
            type="button"
            className="settings-card"
            onClick={() =>
              router.push("/set-pin")
            }
          >

            <div className="settings-card-icon settings-pin-icon">
              <span className="material-symbols-outlined">
                lock
              </span>
            </div>

            <div className="settings-card-text">

              <h3>
                Change PIN
              </h3>

              <p>
                Update your secret access code
              </p>

            </div>

            <span className="material-symbols-outlined settings-chevron">
              chevron_right
            </span>

          </button>

          {/* Logout */}
          <button
            type="button"
            className="settings-card settings-logout-card"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >

            <div className="settings-card-icon settings-logout-icon">
              <span className="material-symbols-outlined">
                logout
              </span>
            </div>

            <div className="settings-card-text">

              <h3>
                {isLoggingOut
                  ? "Logging out..."
                  : "Logout"}
              </h3>

              <p>
                Sign out of our little space
              </p>

            </div>

          </button>

        </section>

      </main>

      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <nav className="settings-bottom-nav">

        <div className="settings-bottom-nav-inner">

          {/* Home */}
          <button
            type="button"
            className="settings-nav-item"
            onClick={() =>
              router.push("/")
            }
          >
            <span className="material-symbols-outlined">
              home
            </span>

            <span>
              Home
            </span>
          </button>

          {/* Calendar */}
          <button
            type="button"
            className="settings-nav-item"
            onClick={() =>
              router.push("/calendar")
            }
          >
            <span className="material-symbols-outlined">
              favorite
            </span>

            <span>
              Dates
            </span>
          </button>


          {/* Chat */}
          <button
            type="button"
            className="settings-nav-item"
            onClick={() =>
              router.push("/chat")
            }
          >
            <span className="material-symbols-outlined">
              chat_bubble
            </span>

            <span>
              Chat
            </span>
          </button>


          {/* Settings */}
          <button
            type="button"
            className="settings-nav-item active"
            aria-current="page"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              settings
            </span>

            <span>
              Settings
            </span>
          </button>

        </div>

      </nav>

    </main>
  );
}