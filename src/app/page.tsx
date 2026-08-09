"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { hasPin } from "@/lib/auth";
import {
  isAllowedEmail,
  isPinUnlocked,
} from "@/lib/session";

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [avatar, setAvatar] = useState("/characters/aadi.png");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email || !isAllowedEmail(user.email)) {
        router.replace("/login");
        return;
      }

      try {
        const pinExists = await hasPin();

        if (!pinExists) {
          router.replace("/set-pin");
          return;
        }

        if (!isPinUnlocked(user.uid)) {
          router.replace("/pin");
          return;
        }

        setAvatar(
          user.email.toLowerCase() === "spaadi1601@gmail.com"
            ? "/characters/aadi.png"
            : "/characters/ammu.png"
        );
        setReady(true);
      } catch (error) {
        console.error("Home authentication check failed:", error);
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (!ready) {
    return (
      <main className="app-loading">
        <div className="app-loading-heart">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
        </div>
        <p>Opening your little corner...</p>
      </main>
    );
  }

  return (
    <main className="home-screen">
      <header className="home-header">
        <div className="home-header-inner">
          <button
            type="button"
            className="home-profile-button"
            aria-label="Open settings"
            onClick={() => router.push("/settings")}
          >
            <img
              src={avatar}
              alt="Your profile"
              className="home-profile-image"
            />
          </button>

          <h1>Khushi</h1>

          <button
            type="button"
            className="home-settings-button"
            aria-label="Settings"
            onClick={() => router.push("/settings")}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              settings
            </span>
          </button>
        </div>
      </header>

      <section className="home-content">
        <Link href="/chat" className="home-gateway-card">
          <div className="home-card-icon home-card-icon-chat">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              chat_bubble
            </span>
          </div>
          <h2>Sweet Nothings</h2>
          <p>Continue the conversation</p>
        </Link>

        <Link href="/calendar" className="home-gateway-card">
          <div className="home-card-icon home-card-icon-calendar">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              calendar_today
            </span>
          </div>
          <h2>Our Dates</h2>
          <p>Plan the next adventure</p>
        </Link>
      </section>

      {/* <nav className="home-bottom-nav" aria-label="Primary navigation">
        <div className="home-bottom-nav-inner">
          <Link href="/" className="home-nav-item active" aria-current="page">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              home
            </span>
            <span>Home</span>
          </Link>

          <Link href="/calendar" className="home-nav-item">
            <span className="material-symbols-outlined">favorite</span>
            <span>Dates</span>
          </Link>

          <Link href="/chat" className="home-nav-item">
            <span className="material-symbols-outlined">chat_bubble</span>
            <span>Chat</span>
          </Link>

          <Link href="/settings" className="home-nav-item">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </Link>
        </div>
      </nav> */}
      <nav className="calendar-bottom-nav" aria-label="Primary navigation">

        <Link href="/" className="calendar-nav-item" aria-current="page">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            home
          </span>
          <span>Home</span>
        </Link>
        
          <Link href="/calendar" className="calendar-nav-item">
          <span className="material-symbols-outlined">favorite</span>
          <span>Dates</span>
        </Link>

        <Link href="/chat" className="calendar-nav-item">
          <span className="material-symbols-outlined">chat_bubble</span>
          <span>Chat</span>
        </Link>

        <Link href="/settings" className="calendar-nav-item">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </Link>
      </nav>
    </main>
  );
}
