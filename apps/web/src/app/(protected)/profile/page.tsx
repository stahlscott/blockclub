"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MAX_LENGTHS } from "@/lib/validation";
import { AvatarUpload } from "@/components/AvatarUpload";
import profileStyles from "./profile.module.css";

interface PhoneEntry {
  label: string;
  number: string;
}

interface EmailEntry {
  label: string;
  email: string;
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

// Basic email validation
function isValidEmail(email: string): boolean {
  if (!email.trim()) return true; // Empty is OK
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [moveInYear, setMoveInYear] = useState("");
  const [children, setChildren] = useState("");
  const [pets, setPets] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
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
        setAvatarUrl(profileData.avatar_url || null);
        setAddress(profileData.address || "");
        setUnit(profileData.unit || "");
        setMoveInYear(
          profileData.move_in_year ? String(profileData.move_in_year) : "",
        );
        setChildren(profileData.children || "");
        setPets(profileData.pets || "");

        // Load phones array, or migrate from legacy phone field
        if (profileData.phones && profileData.phones.length > 0) {
          // Format existing phone numbers for display
          setPhones(
            profileData.phones.map((p: PhoneEntry) => ({
              ...p,
              number: formatPhoneInput(p.number),
            })),
          );
        } else if (profileData.phone) {
          setPhones([
            { label: "Primary", number: formatPhoneInput(profileData.phone) },
          ]);
        } else {
          setPhones([]);
        }

        // Load emails array
        if (profileData.emails && profileData.emails.length > 0) {
          setEmails(profileData.emails);
        } else {
          setEmails([]);
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

  const updatePhone = (
    index: number,
    field: "label" | "number",
    value: string,
  ) => {
    const updated = [...phones];
    if (field === "number") {
      // Auto-format phone number as user types
      updated[index] = { ...updated[index], number: formatPhoneInput(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setPhones(updated);
  };

  const addEmail = () => {
    setEmails([...emails, { label: "", email: "" }]);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (
    index: number,
    field: "label" | "email",
    value: string,
  ) => {
    const updated = [...emails];
    updated[index] = { ...updated[index], [field]: value };
    setEmails(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate address is required
    if (!address.trim()) {
      setError("Address is required");
      return;
    }

    // Validate all phone numbers
    const invalidPhone = phones.find(
      (p) => p.number && !isValidPhone(p.number),
    );
    if (invalidPhone) {
      setError("Phone numbers must be 10 digits");
      return;
    }

    // Validate all email addresses
    const invalidEmail = emails.find((e) => e.email && !isValidEmail(e.email));
    if (invalidEmail) {
      setError("Please enter valid email addresses");
      return;
    }

    // Validate move-in year if provided
    const currentYear = new Date().getFullYear();
    const moveInYearNum = moveInYear ? parseInt(moveInYear, 10) : null;
    if (
      moveInYearNum !== null &&
      (moveInYearNum < 1900 || moveInYearNum > currentYear)
    ) {
      setError(`Move-in year must be between 1900 and ${currentYear}`);
      return;
    }

    // Filter out empty entries and normalize numbers
    const cleanedPhones = phones
      .filter((p) => p.number.trim())
      .map((p) => ({
        label: p.label.trim() || "Primary",
        number: normalizePhone(p.number),
      }));

    // Filter out empty email entries
    const cleanedEmails = emails
      .filter((e) => e.email.trim())
      .map((e) => ({
        label: e.label.trim() || "Personal",
        email: e.email.trim().toLowerCase(),
      }));

    setSaving(true);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("users")
      .update({
        name,
        bio: bio || null,
        avatar_url: avatarUrl,
        phones: cleanedPhones,
        // Also update legacy phone field for backward compatibility
        phone: cleanedPhones.length > 0 ? cleanedPhones[0].number : null,
        emails: cleanedEmails,
        address: address.trim(),
        unit: unit.trim() || null,
        move_in_year: moveInYearNum,
        children: children.trim() || null,
        pets: pets.trim() || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setPhones(cleanedPhones.length > 0 ? cleanedPhones : []);
      setEmails(cleanedEmails.length > 0 ? cleanedEmails : []);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className={profileStyles.container}>
        <div className={profileStyles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={profileStyles.container}>
      <div className={profileStyles.card}>
        <Link href="/dashboard" className={profileStyles.backLink}>
          &larr; Back to Dashboard
        </Link>

        <h1 className={profileStyles.title}>Edit Profile</h1>

        <form onSubmit={handleSubmit} className={profileStyles.form}>
          <AvatarUpload
            userId={user.id}
            currentAvatarUrl={avatarUrl}
            name={name || "User"}
            onUploadComplete={(url) => setAvatarUrl(url)}
            onError={(msg) => setError(msg)}
          />

          <div className={profileStyles.inputGroup}>
            <label htmlFor="name" className={profileStyles.label}>
              Household Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={MAX_LENGTHS.userName}
              className={profileStyles.input}
              placeholder="e.g., The Smith Family"
            />
          </div>

          <div className={profileStyles.inputGroup}>
            <label htmlFor="address" className={profileStyles.label}>
              Address *
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              maxLength={MAX_LENGTHS.address}
              className={profileStyles.input}
              placeholder="123 Main Street"
            />
          </div>

          <div className={profileStyles.inputGroup}>
            <label htmlFor="unit" className={profileStyles.label}>
              Unit
            </label>
            <input
              id="unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              maxLength={MAX_LENGTHS.unit}
              className={profileStyles.input}
              placeholder="Apt 2B"
            />
          </div>

          <div className={profileStyles.inputGroup}>
            <label className={profileStyles.label}>Phone Numbers</label>
            <span className={profileStyles.hint}>
              Add phone numbers for household members. Visible to neighbors.
            </span>

            <div className={profileStyles.phoneList}>
              {phones.map((phone, index) => (
                <div key={index} className={profileStyles.phoneRow}>
                  <input
                    type="text"
                    value={phone.label}
                    onChange={(e) =>
                      updatePhone(index, "label", e.target.value)
                    }
                    className={profileStyles.phoneLabelInput}
                    placeholder="Label (e.g., Mom)"
                  />
                  <input
                    type="tel"
                    value={phone.number}
                    onChange={(e) =>
                      updatePhone(index, "number", e.target.value)
                    }
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
                className={profileStyles.addPhoneButton}
              >
                + Add Phone Number
              </button>
            </div>
          </div>

          <div className={profileStyles.inputGroup}>
            <label className={profileStyles.label}>Email Addresses</label>
            <span className={profileStyles.hint}>
              Add email addresses for your household. Visible to neighbors.
            </span>

            <div className={profileStyles.phoneList}>
              {emails.map((emailEntry, index) => (
                <div key={index} className={profileStyles.phoneRow}>
                  <input
                    type="text"
                    value={emailEntry.label}
                    onChange={(e) =>
                      updateEmail(index, "label", e.target.value)
                    }
                    className={profileStyles.phoneLabelInput}
                    placeholder="Label (e.g., Personal)"
                  />
                  <input
                    type="email"
                    value={emailEntry.email}
                    onChange={(e) =>
                      updateEmail(index, "email", e.target.value)
                    }
                    className={profileStyles.phoneNumberInput}
                    placeholder="email@example.com"
                  />
                  <button
                    type="button"
                    onClick={() => removeEmail(index)}
                    className={profileStyles.removeButton}
                    aria-label="Remove email"
                  >
                    &times;
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addEmail}
                className={profileStyles.addPhoneButton}
              >
                + Add Email Address
              </button>
            </div>
          </div>

          <div className={profileStyles.inputGroup}>
            <label htmlFor="moveInYear" className={profileStyles.label}>
              Move-in Year
            </label>
            <input
              id="moveInYear"
              type="number"
              value={moveInYear}
              onChange={(e) => setMoveInYear(e.target.value)}
              min={1900}
              max={new Date().getFullYear()}
              className={profileStyles.input}
              placeholder="2020"
            />
          </div>

          <div className={profileStyles.inputGroup}>
            <label htmlFor="children" className={profileStyles.label}>
              Children
            </label>
            <textarea
              id="children"
              value={children}
              onChange={(e) => setChildren(e.target.value)}
              maxLength={MAX_LENGTHS.children}
              className={profileStyles.textarea}
              placeholder="e.g., Emma (8), Jack (5)"
              rows={2}
            />
            <span className={profileStyles.hint}>
              Names and ages of children in your household
            </span>
          </div>

          <div className={profileStyles.inputGroup}>
            <label htmlFor="pets" className={profileStyles.label}>
              Pets
            </label>
            <textarea
              id="pets"
              value={pets}
              onChange={(e) => setPets(e.target.value)}
              maxLength={MAX_LENGTHS.pets}
              className={profileStyles.textarea}
              placeholder="e.g., Golden retriever named Max"
              rows={2}
            />
            <span className={profileStyles.hint}>Pets in your household</span>
          </div>

          <div className={profileStyles.inputGroup}>
            <label htmlFor="bio" className={profileStyles.label}>
              About Your Household
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_LENGTHS.userBio}
              className={profileStyles.textarea}
              placeholder="Tell your neighbors a bit about yourselves..."
              rows={4}
            />
            {bio.length > MAX_LENGTHS.userBio * 0.8 && (
              <span className={profileStyles.charCount}>
                {bio.length}/{MAX_LENGTHS.userBio}
              </span>
            )}
          </div>

          {error && <p className={profileStyles.error}>{error}</p>}
          {success && (
            <p className={profileStyles.success}>Profile updated successfully!</p>
          )}

          <button type="submit" disabled={saving} className={profileStyles.button}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
