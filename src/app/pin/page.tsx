"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { hasPin, verifyPin } from "@/lib/auth";
import {
  isAllowedEmail,
  setPinUnlocked,
} from "@/lib/session";

const PIN_LENGTH = 4;

export default function PinPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [checkingPin, setCheckingPin] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email || !isAllowedEmail(user.email)) {
        router.replace("/login");
        return;
      }

      try {
        const exists = await hasPin();

        if (!exists) {
          router.replace("/set-pin");
          return;
        }

        setCheckingPin(false);
      } catch (error) {
        console.error("PIN check failed:", error);
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleNumber = (number: string) => {
    if (checkingPin || verifying || pin.length >= PIN_LENGTH) return;

    setError("");
    const newPin = pin + number;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      void verifyEnteredPin(newPin);
    }
  };

  const verifyEnteredPin = async (enteredPin: string) => {
    const user = auth.currentUser;
    if (!user || verifying) return;

    setVerifying(true);

    try {
      const correct = await verifyPin(enteredPin);

      if (correct) {
        setPinUnlocked(user.uid);
        router.replace("/");
        return;
      }

      setError("Incorrect PIN. Please try again.");
      setPin("");
    } catch (error) {
      console.error("PIN verification failed:", error);
      setError("Something went wrong. Please try again.");
      setPin("");
    } finally {
      setVerifying(false);
    }
  };

  const handleBackspace = () => {
    if (checkingPin || verifying) return;
    setError("");
    setPin((current) => current.slice(0, -1));
  };

  if (checkingPin) {
    return (
      <main className="app-loading">
        <div className="app-loading-heart">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock_person
          </span>
        </div>
        <p>Checking your secure space...</p>
      </main>
    );
  }

  return (
    <main className="pin-screen">
      <div className="pin-container">
        <div className="pin-header">
          <div className="pin-lock-circle">
            <span
              className="material-symbols-outlined pin-lock-icon"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock_person
            </span>
          </div>

          <h1>Welcome Back</h1>
          <p>Please enter your secret PIN</p>
        </div>

        <div className="pin-dots" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <div
              key={index}
              className={`pin-dot ${index < pin.length ? "filled" : ""}`}
            />
          ))}
        </div>

        {error && <p className="pin-error" role="alert">{error}</p>}

        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
            (number) => (
              <button
                key={number}
                type="button"
                className="keypad-button"
                onClick={() => handleNumber(number)}
                disabled={verifying}
                aria-label={`Enter ${number}`}
              >
                {number}
              </button>
            )
          )}

          <div className="keypad-empty" />

          <button
            type="button"
            className="keypad-button"
            onClick={() => handleNumber("0")}
            disabled={verifying}
            aria-label="Enter 0"
          >
            0
          </button>

          <button
            type="button"
            className="keypad-button keypad-backspace"
            onClick={handleBackspace}
            disabled={verifying}
            aria-label="Backspace"
          >
            <span className="material-symbols-outlined">backspace</span>
          </button>
        </div>
      </div>

      <div className="decoration decoration-one" />
      <div className="decoration decoration-two" />
    </main>
  );
}
