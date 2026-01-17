"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MAX_LENGTHS } from "@/lib/validation";
import { AvatarUpload } from "@/components/AvatarUpload";
import { updateProfile } from "./actions";
import profileStyles from "./profile.module.css";

interface PhoneEntry {
  label: string;
  number: string;
}

interface EmailEntry {
  label: string;
  email: string;
}

interface Profile {
  id: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phones: PhoneEntry[] | null;
  phone: string | null;
  emails: EmailEntry[] | null;
  address: string | null;
  unit: string | null;
  move_in_year: number | null;
  children: string | null;
  pets: string | null;
}

interface ProfileFormProps {
  userId: string;
  profile: Profile;
  isImpersonating: boolean;
  impersonatedUserName: string | null;
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

export function ProfileForm({ userId, profile, isImpersonating, impersonatedUserName }: ProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [address, setAddress] = useState(profile.address || "");
  const [unit, setUnit] = useState(profile.unit || "");
  const [moveInYear, setMoveInYear] = useState(
    profile.move_in_year ? String(profile.move_in_year) : ""
  );
  const [children, setChildren] = useState(profile.children || "");
  const [pets, setPets] = useState(profile.pets || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize phones from profile
  const [phones, setPhones] = useState<PhoneEntry[]>(() => {
    if (profile.phones && profile.phones.length > 0) {
      return profile.phones.map((p) => ({
        ...p,
        number: formatPhoneInput(p.number),
      }));
    } else if (profile.phone) {
      return [{ label: "Primary", number: formatPhoneInput(profile.phone) }];
    }
    return [];
  });

  // Initialize emails from profile
  const [emails, setEmails] = useState<EmailEntry[]>(
    profile.emails && profile.emails.length > 0 ? profile.emails : []
  );

  const addPhone = () => {
    setPhones([...phones, { label: "", number: "" }]);
  };

  const removePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const updatePhone = (
    index: number,
    field: "label" | "number",
    value: string
  ) => {
    const updated = [...phones];
    if (field === "number") {
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
    value: string
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
      (p) => p.number && !isValidPhone(p.number)
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

    const result = await updateProfile({
      userId,
      name,
      bio: bio || null,
      avatarUrl,
      phones: cleanedPhones,
      emails: cleanedEmails,
      address: address.trim(),
      unit: unit.trim() || null,
      moveInYear: moveInYearNum,
      children: children.trim() || null,
      pets: pets.trim() || null,
    });

    if (!result.success) {
      setError(result.error || "Failed to save profile");
    } else {
      setSuccess(true);
      setPhones(cleanedPhones.length > 0 ? cleanedPhones : []);
      setEmails(cleanedEmails.length > 0 ? cleanedEmails : []);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  };

  return (
    <div className={profileStyles.container}>
      <div className={profileStyles.card}>
        <Link href="/dashboard" className={profileStyles.backLink}>
          &larr; Back to Dashboard
        </Link>

        <h1 className={profileStyles.title}>
          {isImpersonating ? `Edit Profile: ${impersonatedUserName || "User"}` : "Edit Profile"}
        </h1>

        {isImpersonating && (
          <p className={profileStyles.impersonationNote}>
            You are editing this profile as a staff admin.
          </p>
        )}

        <form onSubmit={handleSubmit} className={profileStyles.form}>
          <AvatarUpload
            userId={userId}
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
