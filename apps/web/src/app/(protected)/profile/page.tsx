"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MAX_LENGTHS } from "@/lib/validation";
import profileStyles from "./profile.module.css";

interface PhoneEntry {
  label: string;
  number: string;
}

// Format phone as user types: 5551234567 -> 555-123-4567
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
}

// Validate phone is 10 digits (or empty)
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 0 || digits.length === 10;
}

// Strip to digits only
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/signin");
        return;
      }

      setUser(authUser);

      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileData) {
        setName(profileData.name || "");
        setBio(profileData.bio || "");
        
        // Load phones array, or migrate from legacy phone field
        if (profileData.phones && profileData.phones.length > 0) {
          // Format existing phone numbers for display
          setPhones(profileData.phones.map((p: PhoneEntry) => ({
            ...p,
            number: formatPhoneInput(p.number)
          })));
        } else if (profileData.phone) {
          setPhones([{ label: "Primary", number: formatPhoneInput(profileData.phone) }]);
        } else {
          setPhones([]);
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const addPhone = () => {
    setPhones([...phones, { label: "", number: "" }]);
  };

  const removePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const updatePhone = (index: number, field: "label" | "number", value: string) => {
    const updated = [...phones];
    if (field === "number") {
      // Auto-format phone number as user types
      updated[index] = { ...updated[index], number: formatPhoneInput(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setPhones(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate all phone numbers
    const invalidPhone = phones.find(p => p.number && !isValidPhone(p.number));
    if (invalidPhone) {
      setError("Phone numbers must be 10 digits");
      return;
    }

    // Filter out empty entries and normalize numbers
    const cleanedPhones = phones
      .filter(p => p.number.trim())
      .map(p => ({
        label: p.label.trim() || "Primary",
        number: normalizePhone(p.number),
      }));

    setSaving(true);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("users")
      .update({
        name,
        bio: bio || null,
        phones: cleanedPhones,
        // Also update legacy phone field for backward compatibility
        phone: cleanedPhones.length > 0 ? cleanedPhones[0].number : null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setPhones(cleanedPhones.length > 0 ? cleanedPhones : []);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link href="/dashboard" style={styles.backLink}>
          &larr; Back to Dashboard
        </Link>

        <h1 style={styles.title}>Edit Profile</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              style={{ ...styles.input, ...styles.inputDisabled }}
            />
            <span style={styles.hint}>
              Email cannot be changed
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="name" style={styles.label}>
              Household Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={MAX_LENGTHS.userName}
              style={styles.input}
              placeholder="e.g., The Smith Family"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Phone Numbers
            </label>
            <span style={styles.hint}>
              Add phone numbers for household members. Visible to neighbors.
            </span>
            
            <div style={styles.phoneList}>
              {phones.map((phone, index) => (
                <div key={index} className={profileStyles.phoneRow}>
                  <input
                    type="text"
                    value={phone.label}
                    onChange={(e) => updatePhone(index, "label", e.target.value)}
                    className={profileStyles.phoneLabelInput}
                    placeholder="Label (e.g., Mom)"
                  />
                  <input
                    type="tel"
                    value={phone.number}
                    onChange={(e) => updatePhone(index, "number", e.target.value)}
                    className={profileStyles.phoneNumberInput}
                    placeholder="555-555-5555"
                    maxLength={12}
                  />
                  <button
                    type="button"
                    onClick={() => removePhone(index)}
                    className={profileStyles.removeButton}
                    aria-label="Remove phone"
                  >
                    &times;
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addPhone}
                style={styles.addPhoneButton}
              >
                + Add Phone Number
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="bio" style={styles.label}>
              About Your Household
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_LENGTHS.userBio}
              style={styles.textarea}
              placeholder="Tell your neighbors a bit about yourselves..."
              rows={4}
            />
            {bio.length > MAX_LENGTHS.userBio * 0.8 && (
              <span style={styles.charCount}>
                {bio.length}/{MAX_LENGTHS.userBio}
              </span>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>Profile updated successfully!</p>}

          <button type="submit" disabled={saving} style={styles.button}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "500px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  card: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1.5rem",
  },
  title: {
    margin: "0 0 1.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  input: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
  },
  inputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    cursor: "not-allowed",
  },
  textarea: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    resize: "vertical" as const,
    fontFamily: "inherit",
  },
  hint: {
    fontSize: "0.75rem",
    color: "#888",
    marginTop: "0.25rem",
    marginBottom: "0.5rem",
  },
  phoneList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  phoneRow: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  },
  phoneLabelInput: {
    flex: "0 0 100px",
    padding: "0.625rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "0.875rem",
  },
  phoneNumberInput: {
    flex: 1,
    padding: "0.625rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "0.875rem",
  },
  removeButton: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    backgroundColor: "white",
    color: "#999",
    fontSize: "1.25rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  addPhoneButton: {
    padding: "0.625rem",
    borderRadius: "6px",
    border: "1px dashed #ddd",
    backgroundColor: "transparent",
    color: "#666",
    fontSize: "0.875rem",
    cursor: "pointer",
    marginTop: "0.25rem",
  },
  button: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    margin: 0,
  },
  success: {
    color: "#059669",
    fontSize: "0.875rem",
    margin: 0,
  },
  charCount: {
    fontSize: "0.75rem",
    color: "#888",
    textAlign: "right" as const,
  },
};
