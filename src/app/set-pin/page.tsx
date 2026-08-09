"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { hasPin, savePin } from "@/lib/auth";
import {
  isAllowedEmail,
  isPinUnlocked,
  setPinUnlocked,
} from "@/lib/session";

const MAX_PIN_LENGTH = 4;

type Status = "idle" | "saving" | "saved" | "error";

export default function SetPinPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [avatar, setAvatar] = useState("/characters/aadi.png");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email || !isAllowedEmail(user.email)) {
        router.replace("/login");
        return;
      }

      try {
        const exists = await hasPin();

        if (exists && !isPinUnlocked(user.uid)) {
          router.replace("/pin");
          return;
        }

        setIsChanging(exists);
        setAvatar(
          user.email.toLowerCase() === "spaadi1601@gmail.com"
            ? "/characters/aadi.png"
            : "/characters/ammu.png"
        );
        setReady(true);
      } catch (error) {
        console.error("PIN setup check failed:", error);
        router.replace("/login");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  const handleNumber = (number: string) => {
    if (pin.length >= MAX_PIN_LENGTH || status !== "idle") return;

    setError("");
    setPin((current) => current + number);
  };

  const handleBackspace = () => {
    if (status !== "idle") return;
    setError("");
    setPin((current) => current.slice(0, -1));
  };

  const handleConfirm = async () => {
    if (pin.length !== MAX_PIN_LENGTH || status !== "idle") return;

    setError("");
    setStatus("saving");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user.");

      await savePin(pin);
      setPinUnlocked(user.uid);
      setStatus("saved");

      window.setTimeout(() => {
        router.replace(isChanging ? "/settings" : "/");
      }, 600);
    } catch (error) {
      console.error("Failed to save PIN:", error);
      setStatus("error");
      setError("Could not save your PIN. Please try again.");
      setPin("");

      window.setTimeout(() => setStatus("idle"), 100);
    }
  };

  if (!ready) {
    return (
      <main className="app-loading">
        <div className="app-loading-heart">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
        </div>
        <p>Preparing your secure space...</p>
      </main>
    );
  }

  return (
    <main className="set-pin-screen">
      <section className="set-pin-content">
        <div className="set-pin-header">
          <div className="set-pin-image-wrapper">
            <img
              src={avatar}
              alt="Your profile"
              className="set-pin-image"
            />
          </div>

          <h1>{isChanging ? "Change Your PIN" : "Secure Your Space"}</h1>

          <p>
            {isChanging
              ? "Choose a new 4-digit PIN for your private moments."
              : "Set a 4-digit PIN to keep your moments private."}
          </p>
        </div>

        <div
          className="set-pin-dots"
          aria-label={`${pin.length} of ${MAX_PIN_LENGTH} digits entered`}
        >
          {Array.from({ length: MAX_PIN_LENGTH }).map((_, index) => (
            <div
              key={index}
              className={`set-pin-dot ${index < pin.length ? "filled" : ""}`}
            />
          ))}
        </div>

        {error && <p className="set-pin-error" role="alert">{error}</p>}

        <div className="set-pin-keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
            (number) => (
              <button
                key={number}
                type="button"
                className="set-pin-key"
                onClick={() => handleNumber(number)}
                disabled={status !== "idle"}
              >
                {number}
              </button>
            )
          )}

          <div className="set-pin-empty" />

          <button
            type="button"
            className="set-pin-key"
            onClick={() => handleNumber("0")}
            disabled={status !== "idle"}
          >
            0
          </button>

          <button
            type="button"
            className="set-pin-backspace"
            onClick={handleBackspace}
            disabled={status !== "idle"}
            aria-label="Backspace"
          >
            <span className="material-symbols-outlined">backspace</span>
          </button>
        </div>

        <div className="set-pin-confirm-container">
          {pin.length === MAX_PIN_LENGTH && (
            <button
              type="button"
              className={`set-pin-confirm ${status === "saved" ? "saved" : ""}`}
              onClick={handleConfirm}
              disabled={status !== "idle"}
            >
              {status === "idle" && (isChanging ? "Update PIN" : "Confirm PIN")}

              {status === "saving" && (
                <>
                  <span className="material-symbols-outlined spinning-icon">autorenew</span>
                  Saving...
                </>
              )}

              {status === "saved" && (
                <>
                  <span className="material-symbols-outlined">check</span>
                  Saved!
                </>
              )}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
