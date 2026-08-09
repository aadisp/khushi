"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { hasPin } from "@/lib/auth";
import {
  isAllowedEmail,
  isPinUnlocked,
} from "@/lib/session";
import { useRouter } from "next/navigation";

type Month = {
  year: number;
  month: number;
};

type EventDay = {
  year: number;
  month: number;
  day: number;
  name?: string;
};

const DEFAULT_EVENT_NAME = "A special day for Ammu & Aadi";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];



export default function CalendarPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [avatar, setAvatar] = useState("/characters/aadi.png");
  const [currentMonth, setCurrentMonth] = useState<Month>({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  const [selectedDate, setSelectedDate] = useState<{
    year: number;
    month: number;
    day: number;
  } | null>(null);

  const [chibiEventDate, setChibiEventDate] = useState<{
    year: number;
    month: number;
    day: number;
  } | null>(null);

  const [eventDays, setEventDays] = useState<EventDay[]>([]);

  const [showEventNameModal, setShowEventNameModal] = useState(false);
  const [eventName, setEventName] = useState("");
  const [editingEvent, setEditingEvent] = useState<EventDay | null>(null);


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

        setAvatar(
          user.email.toLowerCase() === "spaadi1601@gmail.com"
            ? "/characters/aadi.png"
            : "/characters/ammu.png"
        );
        setReady(true);
      } catch (error) {
        console.error("Calendar authentication check failed:", error);
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
  if (!ready) return;

  const calendarRef = doc(
    db,
    "sharedCalendar",
    "ammu-aadi"
  );

  const unsubscribe = onSnapshot(
    calendarRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        setEventDays([]);
        return;
      }

      const data = snapshot.data();

      setEventDays(
        Array.isArray(data.eventDays)
          ? data.eventDays
          : []
      );
    },
    (error) => {
      console.error(
        "Failed to listen to shared calendar:",
        error
      );
    }
  );

  return () => unsubscribe();
}, [ready]);

  const daysInMonth = new Date(
    currentMonth.year,
    currentMonth.month + 1,
    0
  ).getDate();

  const firstDay = new Date(
    currentMonth.year,
    currentMonth.month,
    1
  ).getDay();

  const goToPreviousMonth = () => {
    setCurrentMonth((current) =>
      current.month === 0
        ? { year: current.year - 1, month: 11 }
        : { ...current, month: current.month - 1 }
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth((current) =>
      current.month === 11
        ? { year: current.year + 1, month: 0 }
        : { ...current, month: current.month + 1 }
    );
  };

  const today = new Date();

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth.month === today.getMonth() &&
      currentMonth.year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate?.day === day &&
      selectedDate?.month === currentMonth.month &&
      selectedDate?.year === currentMonth.year
    );
  };

  const isEventDay = (day: number) => {
    return eventDays.some(
      (event) =>
        event.day === day &&
        event.month === currentMonth.month &&
        event.year === currentMonth.year
    );
  };

  const currentMonthEvents = eventDays
    .filter(
      (event) =>
        event.month === currentMonth.month &&
        event.year === currentMonth.year
    )
    .sort((a, b) => a.day - b.day);

  const toggleEventDay = () => {
    if (!selectedDate) return;

    const exists = eventDays.some(
      (event) =>
        event.day === selectedDate.day &&
        event.month === selectedDate.month &&
        event.year === selectedDate.year
    );

    if (exists) {
      removeEventDay();
    } else {
      setEventName("");
      setShowEventNameModal(true);
    }
  };

  const saveEventDay = async () => {
    if (!selectedDate) return;

    const calendarRef = doc(
      db,
      "sharedCalendar",
      "ammu-aadi"
    );

    const finalEventName =
      eventName.trim() || DEFAULT_EVENT_NAME;

    const newEvent: EventDay = {
      ...selectedDate,
      name: finalEventName,
    };

    try {
      await setDoc(
        calendarRef,
        {
          eventDays: arrayUnion(newEvent),
        },
        { merge: true }
      );

      setShowEventNameModal(false);
      setEventName("");
    } catch (error) {
      console.error(
        "Failed to create event:",
        error
      );
    }
  };

  const editEventName = async () => {
    if (!editingEvent) return;

    const calendarRef = doc(
      db,
      "sharedCalendar",
      "ammu-aadi"
    );

    const updatedEvent: EventDay = {
      ...editingEvent,
      name: eventName.trim() || DEFAULT_EVENT_NAME,
    };

    try {
      await setDoc(
        calendarRef,
        {
          eventDays: arrayRemove(editingEvent),
        },
        { merge: true }
      );

      await setDoc(
        calendarRef,
        {
          eventDays: arrayUnion(updatedEvent),
        },
        { merge: true }
      );

      setEditingEvent(null);
      setShowEventNameModal(false);
      setEventName("");
    } catch (error) {
      console.error("Failed to edit event:", error);
    }
  };

  const removeEventDay = async () => {
    if (!selectedDate) return;

    const calendarRef = doc(
      db,
      "sharedCalendar",
      "ammu-aadi"
    );

    const existingEvent = eventDays.find(
      (event) =>
        event.day === selectedDate.day &&
        event.month === selectedDate.month &&
        event.year === selectedDate.year
    );

    if (!existingEvent) return;

    try {
      await setDoc(
        calendarRef,
        {
          eventDays: arrayRemove(existingEvent),
        },
        { merge: true }
      );
    } catch (error) {
      console.error(
        "Failed to remove event:",
        error
      );
    }
  };

  const renderDays = () => {
    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className="calendar-empty-day"
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(
        <button
          key={day}
          type="button"
          className={`calendar-day ${
            isToday(day) ? "calendar-day-today" : ""
          } ${
            isSelected(day) ? "calendar-day-selected" : ""
          } ${
            isEventDay(day) ? "calendar-day-event" : ""
          }`}
          aria-label={`${MONTH_NAMES[currentMonth.month]} ${day}`}
          onClick={() => {
            const alreadySelected = isSelected(day);
            const markedDate = isEventDay(day);

            setSelectedDate({
              year: currentMonth.year,
              month: currentMonth.month,
              day,
            });

            setChibiEventDate(null);

            if (alreadySelected && markedDate) {
              setTimeout(() => {
                document
                  .getElementById(
                    `event-${currentMonth.year}-${currentMonth.month}-${day}`
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
              }, 0);
            }
          }}
        >
          {chibiEventDate?.year === currentMonth.year &&
            chibiEventDate?.month === currentMonth.month &&
            chibiEventDate?.day === day && (
              <img
                src={avatar}
                alt=""
                className="calendar-chibi visible"
              />
          )}

          <span className="calendar-day-number">
            {day}
          </span>
        </button>
      );
    }

    return cells;
  };

  if (!ready) {
    return (
      <main className="app-loading">
        <div className="app-loading-heart">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            calendar_today
          </span>
        </div>
        <p>Opening your special dates...</p>
      </main>
    );
  }

  return (
    <main className="calendar-screen">
      <header className="calendar-header">
        <div className="calendar-header-inner">
          <div className="calendar-header-left">
            <button
              type="button"
              className="calendar-profile-button"
              onClick={() => router.push("/settings")}
              aria-label="Open settings"
            >
              <img src={avatar} alt="Your profile" />
            </button>
          </div>

            <h1>Our Special Dates</h1>
          
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

      <section className="calendar-content">
        <section className="calendar-card" aria-label="Calendar">
          <div className="calendar-month-header">
            <button
              type="button"
              className="calendar-month-button"
              onClick={goToPreviousMonth}
              aria-label="Previous month"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            <h2>
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </h2>

            <button
              type="button"
              className="calendar-month-button"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>

          <div className="calendar-days">{renderDays()}</div>

          <button
            type="button"
            className="calendar-mark-event-button"
            onClick={toggleEventDay}
            disabled={!selectedDate}
          >
            {selectedDate && isEventDay(selectedDate.day)
              ? "Unmark event day"
              : "Mark selected day"}
          </button>
        </section>

        <section className="upcoming-events">
          <h3>Upcoming Joys</h3>

          {currentMonthEvents.length > 0 ? (
            <div className="event-list">
              {currentMonthEvents.map((event) => (
                <div
                  key={`${event.year}-${event.month}-${event.day}`}
                  id={`event-${event.year}-${event.month}-${event.day}`}
                  className="event-card"
                  onClick={() => {
                    setSelectedDate({
                      year: event.year,
                      month: event.month,
                      day: event.day,
                    });

                    setChibiEventDate({
                      year: event.year,
                      month: event.month,
                      day: event.day,
                    });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedDate({
                        year: event.year,
                        month: event.month,
                        day: event.day,
                      });

                      setChibiEventDate({
                        year: event.year,
                        month: event.month,
                        day: event.day,
                      });
                    }
                  }}
                >
                  <div className="event-icon event-icon-birthday">
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      favorite
                    </span>
                  </div>

                  <div className="event-details">
                    <h4>
                      {MONTH_NAMES[event.month]} {event.day}
                    </h4>

                    <p>
                      {event.name || DEFAULT_EVENT_NAME}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="event-edit-button"
                    aria-label={`Edit ${event.name || DEFAULT_EVENT_NAME}`}
                    onClick={(e) => {
                      e.stopPropagation();

                      setEditingEvent(event);
                      setEventName(event.name || DEFAULT_EVENT_NAME);
                      setShowEventNameModal(true);
                    }}
                  >
                    <span className="material-symbols-outlined">
                      edit
                    </span>
                  </button>

                  <button
                    type="button"
                    className="event-delete-button"
                    aria-label={`Delete ${event.name || DEFAULT_EVENT_NAME}`}
                    onClick={(e) => {
                      e.stopPropagation();

                      setSelectedDate({
                        year: event.year,
                        month: event.month,
                        day: event.day,
                      });

                      removeEventDay();
                    }}
                  >
                    <span className="material-symbols-outlined">
                      delete
                    </span>
                  </button>

                </div>
              ))}
            </div>
          ) : (
            <div className="calendar-empty-state">
              <span className="material-symbols-outlined">
                favorite_border
              </span>

              <p>No special dates here yet.</p>
            </div>
          )}
        </section>
      </section>

      {showEventNameModal && (
        <div className="event-name-overlay">
          <div className="event-name-modal">
            <div className="event-name-heart">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>

            <h2>
              {editingEvent ? "Rename this special day 💗" : "Name this special day 💗"}
            </h2>

            <p>
              {editingEvent
                ? "Give this special day a new little name."
                : "Give this day a little name to remember."}
            </p>

            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Our first date"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (editingEvent) {
                    editEventName();
                  } else {
                    saveEventDay();
                  }
                }
              }}
            />

            <div className="event-name-actions">
              <button
                type="button"
                className="event-name-cancel"
                onClick={() => {
                  setShowEventNameModal(false);
                  setEventName("");
                  setEditingEvent(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="event-name-save"
                onClick={editingEvent ? editEventName : saveEventDay}
              >
                {editingEvent ? "Update 💗" : "Save 💗"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="calendar-bottom-nav" aria-label="Primary navigation">

          <Link href="/" className="calendar-nav-item">
          <span className="material-symbols-outlined">home</span>
          <span>Home</span>
        </Link>

        <Link href="/calendar" className="calendar-nav-item" aria-current="page">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
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
