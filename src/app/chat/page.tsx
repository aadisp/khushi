"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  auth,
  db,
  getFirebaseMessaging,
} from "@/lib/firebase";
import { getToken } from "firebase/messaging";
import {
  isAllowedEmail,
  isPinUnlocked,
} from "@/lib/session";
import { hasPin } from "@/lib/auth";

type MessageType = "text" | "image" | "video";

type ChatMessage = {
  id: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  createdAt: any;
  readBy?: string[];
  reaction?: "heart" | null;
};

const CHAT_ID = "ammu-aadi";

export default function ChatPage() {
  const router = useRouter();

  const [partnerOnline, setPartnerOnline] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef =
  useRef<HTMLElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ messageId: string; time: number } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email || !isAllowedEmail(user.email)) {
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

        setCurrentUser(user);
        setReady(true);
      } catch (error) {
        console.error("Chat authentication check failed:", error);
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

    /*
   * Register this device for Firebase Cloud Messaging.
   */
  useEffect(() => {
    if (!currentUser) return;

    const registerForNotifications = async () => {
      try {
        // Browser does not support notifications.
        if (
          typeof window === "undefined" ||
          !("Notification" in window)
        ) {
          return;
        }

        // Register the Firebase messaging service worker.
        const registration =
          await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
          );

        // Ask the user for notification permission.
        const permission =
          await Notification.requestPermission();

        if (permission !== "granted") {
          console.log(
            "Notification permission was not granted."
          );
          return;
        }

        const messaging =
          await getFirebaseMessaging();

        if (!messaging) {
          console.log(
            "Firebase Messaging is not supported on this device."
          );
          return;
        }

        const token = await getToken(
          messaging,
          {
            vapidKey:
              "BHR5AUdlkTTHzBdDOCtJEO7u7-tF03mExa-6y8is6ky5KtZmZW8Dq5bPWrmwy0kUfTPnS1RAjIaXbkJsKmBVin4",
            serviceWorkerRegistration:
              registration,
          }
        );

        if (!token) {
          console.log(
            "No FCM registration token was generated."
          );
          return;
        }

        /*
         * Store this device's token under the
         * currently logged-in user's document.
         */
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            fcmTokens: arrayUnion(token),
          },
          {
            merge: true,
          }
        );

        console.log(
          "Firebase notification token registered."
        );
      } catch (error) {
        console.error(
          "Failed to register for notifications:",
          error
        );
      }
    };

    void registerForNotifications();
  }, [currentUser]);

  const currentEmail = currentUser?.email?.toLowerCase();
  const isAadi = currentEmail === "spaadi1601@gmail.com";
  const partnerName = isAadi ? "Ammu" : "Aadi";
  const partnerAvatar = isAadi
    ? "/characters/ammu.png"
    : "/characters/aadi.png";

  useEffect(() => {
    if (!currentUser) return;

    const messagesRef = collection(db, "chats", CHAT_ID, "messages");
    const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const incomingMessages: ChatMessage[] = snapshot.docs.map(
          (messageDoc) => ({
            id: messageDoc.id,
            ...(messageDoc.data() as Omit<ChatMessage, "id">),
          })
        );

        setMessages(incomingMessages);

        snapshot.docs.forEach(async (messageDoc) => {
          const data = messageDoc.data();

          if (
            data.senderId !== currentUser.uid &&
            !data.readBy?.includes(currentUser.uid)
          ) {
            try {
              await updateDoc(messageDoc.ref, {
                readBy: arrayUnion(currentUser.uid),
              });
            } catch (error) {
              console.error("Failed to update read status:", error);
            }
          }
        });
      },
      (error) => {
        console.error("Failed to listen to chat:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const partnerUid =
      currentUser.email?.toLowerCase() === "spaadi1601@gmail.com"
        ? "ammu"
        : "aadi";

    const typingRef = doc(db, "chats", CHAT_ID, "typing", partnerUid);

    const unsubscribe = onSnapshot(
      typingRef,
      (snapshot) => {
        setPartnerTyping(snapshot.exists() && snapshot.data().typing === true);
      },
      () => setPartnerTyping(false)
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;

      setShowScrollDown(distanceFromBottom > 120);
    };

    container.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    handleScroll();

    return () => {
      container.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [ready]);

  /*
  * Listen for partner online/offline status.
  *
  * A user is considered online only when:
  * 1. Their presence document says online === true
  * 2. Their last heartbeat is recent
  *
  * This prevents a stale "online" state if their browser crashes,
  * closes unexpectedly, or loses its connection.
  */
  useEffect(() => {
    if (!currentUser) return;

    const partnerId =
      currentUser.email?.toLowerCase() ===
      "spaadi1601@gmail.com"
        ? "ammu"
        : "aadi";

    const presenceRef = doc(
      db,
      "chats",
      CHAT_ID,
      "presence",
      partnerId
    );

    const unsubscribe = onSnapshot(
      presenceRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setPartnerOnline(false);
          return;
        }

        const data = snapshot.data();

        const lastSeen = data.lastSeen;

        if (!lastSeen) {
          setPartnerOnline(false);
          return;
        }

        const lastSeenMillis = lastSeen.toMillis
          ? lastSeen.toMillis()
          : new Date(lastSeen).getTime();

        const heartbeatAge = Date.now() - lastSeenMillis;

        // Our heartbeat runs every 20 seconds.
        // Give it a generous 45-second grace period.
        const isRecentlyActive = heartbeatAge < 45_000;

        setPartnerOnline(
          data.online === true && isRecentlyActive
        );
      },
      (error) => {
        console.error(
          "Failed to listen to partner presence:",
          error
        );

        setPartnerOnline(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  /*
  * Publish our own online status.
  */
  useEffect(() => {
    if (!currentUser) return;

    const userId =
      currentUser.email?.toLowerCase() ===
      "spaadi1601@gmail.com"
        ? "aadi"
        : "ammu";

    const presenceRef = doc(
      db,
      "chats",
      CHAT_ID,
      "presence",
      userId
    );

    const updatePresence = async (online: boolean) => {
      try {
        await setDoc(
          presenceRef,
          {
            online,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error(
          "Failed to update presence:",
          error
        );
      }
    };

    // Mark online immediately.
    void updatePresence(true);

    // Refresh presence every 20 seconds.
    const heartbeat = setInterval(() => {
      void updatePresence(true);
    }, 20_000);

    // Mark offline when the page becomes hidden.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void updatePresence(false);
      } else {
        void updatePresence(true);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      clearInterval(heartbeat);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      void updatePresence(false);
    };
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  const setTyping = async (typing: boolean) => {
    if (!currentUser) return;

    const userType =
      currentUser.email?.toLowerCase() === "spaadi1601@gmail.com"
        ? "aadi"
        : "ammu";

    const typingRef = doc(db, "chats", CHAT_ID, "typing", userType);

    try {
      await setDoc(
        typingRef,
        {
          typing,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to update typing state:", error);
    }
  };

  const sendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || !currentUser || isSending) return;

    setIsSending(true);

    try {
      const messagesRef = collection(db, "chats", CHAT_ID, "messages");

      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        type: "text",
        text: trimmedMessage,
        createdAt: serverTimestamp(),
        readBy: [currentUser.uid],
        reaction: null,
      });

      void sendNotification({
        title: currentUser.email
          ?.toLowerCase() ===
          "spaadi1601@gmail.com"
          ? "Aadi"
          : "Ammu",

        message: trimmedMessage,

        messageType: "text",
      });

      setMessage("");
      await setTyping(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const sendNotification = async ({
    title,
    message,
    messageType = "text",
  }: {
    title: string;
    message: string;
    messageType?: "text" | "image" | "video";
  }) => {
    if (!currentUser) return;

    try {
      const idToken =
        await currentUser.getIdToken();

      const recipientEmail =
        currentUser.email?.toLowerCase() ===
        "spaadi1601@gmail.com"
          ? "ammu32811@gmail.com"
          : "spaadi1601@gmail.com";

      await fetch(
        "/api/send-notification",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${idToken}`,
          },

          body: JSON.stringify({
            recipientEmail,
            title,
            message,
            messageType,
          }),
        }
      );
    } catch (error) {
      /*
      * Notification failure must NEVER
      * prevent the actual message from sending.
      */
      console.error(
        "Failed to send notification:",
        error
      );
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      void setTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        void setTyping(false);
      }, 1500);
    } else {
      void setTyping(false);
    }
  };

  const uploadMedia = async (file: File) => {
    if (!currentUser || isUploading) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      alert("Please select an image or video.");
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadToCloudinary(file);
      const messagesRef = collection(db, "chats", CHAT_ID, "messages");

      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        type: isImage ? "image" : "video",
        mediaUrl: result.url,
        fileName: file.name,
        cloudinaryPublicId: result.publicId,
        mediaFormat: result.format,
        mediaBytes: result.bytes,
        createdAt: serverTimestamp(),
        readBy: [currentUser.uid],
        reaction: null,
      });
            void sendNotification({
        title:
          currentUser.email?.toLowerCase() ===
          "spaadi1601@gmail.com"
            ? "Aadi"
            : "Ammu",

        message: isImage
          ? "Sent you a photo 💗"
          : "Sent you a video 🎥",

        messageType: isImage
          ? "image"
          : "video",
      });
    } catch (error) {
      console.error("Media upload failed:", error);
      alert("The file could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) void uploadMedia(file);
    event.target.value = "";
  };

  const heartMessage = async (messageId: string) => {
    if (!currentUser) return;

    try {
      const messageRef = doc(db, "chats", CHAT_ID, "messages", messageId);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(messageRef);
        if (!snapshot.exists()) return;

        transaction.update(messageRef, {
          reaction: snapshot.data().reaction === "heart" ? null : "heart",
        });
      });
    } catch (error) {
      console.error("Failed to react to message:", error);
    }
  };

  const handleMessageTouch = (
    event: React.TouchEvent,
    messageId: string
  ) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (
      lastTap &&
      lastTap.messageId === messageId &&
      now - lastTap.time < 350
    ) {
      lastTapRef.current = null;
      void heartMessage(messageId);
      return;
    }

    lastTapRef.current = { messageId, time: now };
    void event;
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getDateKey = (timestamp: any) => {
    if (!timestamp) return "pending";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  const formatDateDivider = (timestamp: any) => {
    if (!timestamp) return "Sending...";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (sameDay(date, today)) return "Today";
    if (sameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    });
  };

  const renderMedia = (chatMessage: ChatMessage) => {
    if (!chatMessage.mediaUrl) return null;

    if (chatMessage.type === "image") {
      return (
        <div
          className="chat-image-wrapper"
          onDoubleClick={() => void heartMessage(chatMessage.id)}
          onTouchEnd={(event) => handleMessageTouch(event, chatMessage.id)}
        >
          <img
            src={chatMessage.mediaUrl}
            alt={chatMessage.fileName || "Image"}
          />

          {chatMessage.reaction === "heart" && (
            <div className="chat-image-reaction" aria-label="Heart reaction">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="chat-video-wrapper">
        <video
          src={chatMessage.mediaUrl}
          controls
          playsInline
          preload="metadata"
        />

        <div
          className="chat-video-gesture-layer"
          onDoubleClick={() => void heartMessage(chatMessage.id)}
          onTouchEnd={(event) => handleMessageTouch(event, chatMessage.id)}
          aria-hidden="true"
        />

        {chatMessage.reaction === "heart" && (
          <div className="chat-video-reaction" aria-label="Heart reaction">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
          </div>
        )}
      </div>
    );
  };

  if (!ready || !currentUser) {
    return (
      <main className="app-loading">
        <div className="app-loading-heart">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            chat_bubble
          </span>
        </div>
        <p>Opening your conversation...</p>
      </main>
    );
  }

  let previousDateKey = "";

  return (
    <main className="chat-screen">
      <header className="chat-header">
        <div className="chat-header-left">
          <button
            type="button"
            className="chat-back-button"
            aria-label="Back to home"
            onClick={() => router.push("/")}
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>

          <div className="chat-partner-avatar-wrapper">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="chat-partner-avatar"
            />
            {partnerOnline && (
              <span className="chat-online-dot" />
            )}
          </div>

          <div className="chat-partner-info">
            <h1>{partnerName}</h1>
            <p>
              {partnerTyping
                ? "typing..."
                : partnerOnline
                  ? "Active now"
                  : "Offline"}
            </p>
          </div>
        </div>
      </header>

      <section
        ref={messagesContainerRef}
        className="chat-messages"
        aria-label="Conversation"
      >
        {messages.map((chatMessage) => {
          const isMine = chatMessage.senderId === currentUser.uid;
          const dateKey = getDateKey(chatMessage.createdAt);
          const showDateDivider = dateKey !== previousDateKey;
          previousDateKey = dateKey;

          return (
            <Fragment key={chatMessage.id}>
              {showDateDivider && (
                <div className="chat-date-divider">
                  <span>{formatDateDivider(chatMessage.createdAt)}</span>
                </div>
              )}

              <div
                className={`chat-message-row ${isMine ? "mine" : "partner"}`}
              >
                {!isMine && (
                  <img
                    src={partnerAvatar}
                    alt={partnerName}
                    className="chat-message-avatar"
                  />
                )}

                <div
                  className={`chat-message-column ${isMine ? "mine-column" : ""}`}
                >
                  {chatMessage.type === "text" && (
                    <div
                      className={`chat-bubble ${isMine ? "mine-bubble" : "partner-bubble"}`}
                      onDoubleClick={() => void heartMessage(chatMessage.id)}
                      onTouchEnd={(event) => handleMessageTouch(event, chatMessage.id)}
                    >
                      <p>{chatMessage.text}</p>

                      {chatMessage.reaction === "heart" && (
                        <div className="chat-reaction" aria-label="Heart reaction">
                          <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            favorite
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {chatMessage.type !== "text" && renderMedia(chatMessage)}

                  <div className={isMine ? "chat-image-meta" : "chat-time"}>
                    <span>{formatTime(chatMessage.createdAt)}</span>

                    {isMine && (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-label={
                          chatMessage.readBy?.some(
                            (uid) => uid !== currentUser.uid
                          )
                            ? "Read"
                            : "Sent"
                        }
                      >
                        {chatMessage.readBy?.some(
                          (uid) => uid !== currentUser.uid
                        )
                          ? "done_all"
                          : "done"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}

        {partnerTyping && (
          <div className="chat-typing-row">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="chat-message-avatar"
            />
            <div className="chat-typing-bubble" aria-label={`${partnerName} is typing`}>
              <span className="typing-dot dot-one" />
              <span className="typing-dot dot-two" />
              <span className="typing-dot dot-three" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        <div className="chat-bottom-spacer" />
        {showScrollDown && (
          <button
            type="button"
            className="chat-scroll-down-button"
            aria-label="Scroll to latest messages"
            onClick={scrollToBottom}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: "'FILL' 1",
              }}
            >
              keyboard_arrow_down
            </span>
          </button>
        )}
      </section>

      <div className="chat-input-area">
        <div className="chat-input-container">
          <label
            className="chat-attach-button"
            aria-label="Attach photo or video"
          >
            <span className="material-symbols-outlined">add</span>
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={handleFileSelected}
              disabled={isUploading}
            />
          </label>

          <label
            className="chat-camera-button"
            aria-label="Take a photo or video"
          >
            <span className="material-symbols-outlined">photo_camera</span>
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              hidden
              onChange={handleFileSelected}
              disabled={isUploading}
            />
          </label>

          <div className="chat-text-input-wrapper">
            <textarea
              value={message}
              onChange={(event) => handleMessageChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
              aria-label="Message"
              disabled={isSending || isUploading}
            />
          </div>

          <button
            type="button"
            className="chat-send-button"
            aria-label="Send"
            onClick={() => void sendMessage()}
            disabled={isSending || isUploading || !message.trim()}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              send
            </span>
          </button>
        </div>

        {isUploading && <div className="chat-upload-status">Sending media...</div>}
      </div>
    </main>
  );
}
