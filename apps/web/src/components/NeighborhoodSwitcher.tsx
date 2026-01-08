"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
      console.error("Failed to update primary neighborhood:", error);
      setIsUpdating(false);
      return;
    }

    // Hard refresh to reload server components with new data
    window.location.reload();
  };

  if (neighborhoods.length <= 1) {
    // Single neighborhood - just show the name without dropdown
    return (
      <div style={styles.singleNeighborhood}>
        {currentNeighborhood?.name || "Your Neighborhood"}
      </div>
    );
  }

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.trigger}
        disabled={isUpdating}
      >
        <span style={styles.neighborhoodName}>
          {isUpdating ? "Switching..." : currentNeighborhood?.name || "Select Neighborhood"}
        </span>
        <span style={{ ...styles.chevron, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
          &#9662;
        </span>
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          {neighborhoods.map((neighborhood) => (
            <button
              key={neighborhood.id}
              onClick={() => handleSelect(neighborhood.id)}
              style={{
                ...styles.option,
                backgroundColor:
                  neighborhood.id === currentNeighborhoodId
                    ? "#f0f7ff"
                    : "transparent",
              }}
            >
              <span>{neighborhood.name}</span>
              {neighborhood.id === currentNeighborhoodId && (
                <span style={styles.checkmark}>&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: "relative",
    display: "inline-block",
  },
  singleNeighborhood: {
    fontSize: "1rem",
    color: "#666",
    fontWeight: "500",
  },
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    backgroundColor: "white",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "500",
    color: "#333",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  neighborhoodName: {
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chevron: {
    fontSize: "0.75rem",
    color: "#666",
    transition: "transform 0.15s ease",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    minWidth: "200px",
    backgroundColor: "white",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 100,
    overflow: "hidden",
  },
  option: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "0.75rem 1rem",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    color: "#333",
    textAlign: "left",
    transition: "background-color 0.1s ease",
  },
  checkmark: {
    color: "#2563eb",
    fontWeight: "bold",
  },
};
