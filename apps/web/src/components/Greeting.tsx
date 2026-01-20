"use client";

/**
 * Client-side greeting that uses the user's local timezone.
 * Server components run in UTC, so time-based greetings must be client-rendered.
 */

import { useState, useEffect } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Greeting() {
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return <>{greeting}</>;
}
