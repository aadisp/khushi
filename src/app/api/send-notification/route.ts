export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error(
      "Firebase Admin environment variables are missing."
    );
  }

  return initializeApp({
    credential: cert({
      projectId:
        process.env.FIREBASE_PROJECT_ID,

      clientEmail:
        process.env.FIREBASE_CLIENT_EMAIL,

      privateKey,
    }),
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * Initialize Firebase Admin.
     */
    const app = getAdminApp();

    /*
     * Verify that the request actually comes
     * from a logged-in Firebase user.
     */
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const idToken =
      authorization.substring(7);

   const firebaseApiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!firebaseApiKey) {
  throw new Error(
    "NEXT_PUBLIC_FIREBASE_API_KEY is missing."
  );
}

const verificationResponse =
  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        idToken,
      }),
    }
  );

if (!verificationResponse.ok) {
  return NextResponse.json(
    {
      error:
        "Invalid Firebase authentication token.",
    },
    {
      status: 401,
    }
  );
}

const verificationData =
  await verificationResponse.json();

const authenticatedUser =
  verificationData.users?.[0];

if (!authenticatedUser) {
  return NextResponse.json(
    {
      error:
        "Authenticated user not found.",
    },
    {
      status: 401,
    }
  );
}

const senderEmail =
  authenticatedUser.email?.toLowerCase();

const senderUid =
  authenticatedUser.localId;

/*
 * Only our two Khushi accounts are allowed
 * to trigger notifications.
 */

    const allowedEmails = [
      "ammu32811@gmail.com",
      "spaadi1601@gmail.com",
    ];

    if (
      !senderEmail ||
      !allowedEmails.includes(senderEmail)
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Read notification information.
     */
    const body = await request.json();

    const {
      recipientEmail,
      title,
      message,
      messageType,
    } = body;

    if (
      !recipientEmail ||
      !title ||
      !message
    ) {
      return NextResponse.json(
        {
          error:
            "recipientEmail, title and message are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Never send a notification to yourself.
     */
    if (
      recipientEmail.toLowerCase() ===
      senderEmail
    ) {
      return NextResponse.json({
        success: true,
        skipped: true,
      });
    }

    /*
     * Find the recipient's Firebase Auth account.
     */
    const firestore =
  getFirestore(app);

const recipientQuery =
  await firestore
    .collection("users")
    .where(
      "email",
      "==",
      recipientEmail.toLowerCase()
    )
    .limit(1)
    .get();

if (recipientQuery.empty) {
  return NextResponse.json({
    success: true,
    sent: 0,
    reason:
      "Recipient user document does not exist.",
  });
}

const recipientDoc =
  recipientQuery.docs[0];

const recipientUid =
  recipientDoc.id;

    /*
     * Get the recipient's saved FCM tokens.
     */
    const recipientRef =
  firestore
    .collection("users")
    .doc(recipientUid);

    const recipientSnapshot =
      await recipientRef.get();

    if (!recipientSnapshot.exists) {
      return NextResponse.json({
        success: true,
        sent: 0,
        reason:
          "Recipient user document does not exist.",
      });
    }

    const userData =
      recipientSnapshot.data();

    const tokens = Array.isArray(
      userData?.fcmTokens
    )
      ? userData.fcmTokens.filter(
          (token): token is string =>
            typeof token === "string" &&
            token.length > 0
        )
      : [];

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        reason:
          "Recipient has no notification tokens.",
      });
    }

    /*
     * Send the notification to every registered
     * device/browser belonging to the recipient.
     */
    const messaging =
      getMessaging(app);

    const response =
      await messaging.sendEachForMulticast({
        tokens,

        notification: {
          title,
          body: message,
        },

        data: {
          chatId: "ammu-aadi",
          senderEmail,
          messageType:
            messageType || "text",
          url: "/chat",
        },

        webpush: {
          fcmOptions: {
            link: "/chat",
          },
        },
      });

    /*
     * Remove tokens that Firebase says are no
     * longer valid.
     */
    const invalidTokens: string[] = [];

    response.responses.forEach(
      (result, index) => {
        if (!result.success) {
          const errorCode =
            result.error?.code;

          if (
            errorCode ===
              "messaging/registration-token-not-registered" ||
            errorCode ===
              "messaging/invalid-registration-token"
          ) {
            invalidTokens.push(
              tokens[index]
            );
          }
        }
      }
    );

    if (invalidTokens.length > 0) {
      await recipientRef.update({
        fcmTokens: FieldValue.arrayRemove(
          ...invalidTokens
        ),
      });
    }

    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    });
  } catch (error: any) {
    console.error(
      "Notification API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to send notification.",
      },
      {
        status: 500,
      }
    );
  }
}