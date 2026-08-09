import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export async function loginUser(
  email: string,
  password: string
) {
  return signInWithEmailAndPassword(
    auth,
    email,
    password
  );
}

export async function logoutUser() {
  return signOut(auth);
}

/*
 * Convert the 4-digit PIN into a SHA-256 hash.
 * We store the hash instead of the actual PIN.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/*
 * Check whether the currently authenticated user
 * already has a PIN.
 */
export async function hasPin(): Promise<boolean> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return false;
  }

  const data = userSnapshot.data();

  return Boolean(data.pinHash);
}

/*
 * Save a new PIN for the currently authenticated user.
 */
export async function savePin(pin: string): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const pinHash = await hashPin(pin);

  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      pinHash,
      email: user.email,
    },
    {
      merge: true,
    }
  );
}

/*
 * Verify the PIN entered by the user.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return false;
  }

  const data = userSnapshot.data();

  if (!data.pinHash) {
    return false;
  }

  const enteredPinHash = await hashPin(pin);

  return enteredPinHash === data.pinHash;
}