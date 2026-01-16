"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import styles from "./NeighborhoodSwitcher.module.css";

interface Neighborhood {
  id: string;
  name: string;
  slug: string;
}

interface NeighborhoodSwitcherProps {
  neighborhoods: Neighborhood[];
  currentNeighborhoodId: string;
  userId: string;
}

export function NeighborhoodSwitcher({
  neighborhoods,
  currentNeighborhoodId,
  userId,
}: NeighborhoodSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentNeighborhood = neighborhoods.find(
    (n) => n.id === currentNeighborhoodId
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (neighborhoodId: string) => {
    if (neighborhoodId === currentNeighborhoodId) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    setIsOpen(false);
    const supabase = createClient();

    const { error } = await supabase
      .from("users")
      .update({ primary_neighborhood_id: neighborhoodId })
      .eq("id", userId);

    if (error) {
      logger.error("Failed to update primary neighborhood", error);
      setIsUpdating(false);
      return;
    }

    // Hard refresh to reload server components with new data
    window.location.reload();
  };

  if (neighborhoods.length <= 1) {
    // Single neighborhood - just show the name without dropdown
    return (
      <div className={styles.singleNeighborhood}>
        {currentNeighborhood?.name || "Your Neighborhood"}
      </div>
    );
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.trigger}
        disabled={isUpdating}
      >
        <span className={styles.neighborhoodName}>
          {isUpdating ? "Switching..." : currentNeighborhood?.name || "Select Neighborhood"}
        </span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}>
          &#9662;
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {neighborhoods.map((neighborhood) => (
            <button
              key={neighborhood.id}
              onClick={() => handleSelect(neighborhood.id)}
              className={`${styles.option} ${neighborhood.id === currentNeighborhoodId ? styles.optionActive : ""}`}
            >
              <span>{neighborhood.name}</span>
              {neighborhood.id === currentNeighborhoodId && (
                <span className={styles.checkmark}>&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
