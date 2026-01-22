"use client";

// TODO: Consider converting to useActionState (React 19) for form submission state.
// Current approach uses manual useState for buttonState/error which works but
// useActionState provides automatic isPending state. See borrow-button.tsx for example.
// Note: Complex forms with dynamic arrays (phones, emails) may be harder to convert.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MAX_LENGTHS } from "@/lib/validation";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ProfileGalleryUpload } from "@/components/ProfileGalleryUpload";
import { updateProfile } from "./actions";
import styles from "./profile.module.css";

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
  photo_urls: string[];
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
  const trimmed = email.trim();
  if (!trimmed) return true; // Empty is OK
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function ProfileForm({ userId, profile, isImpersonating, impersonatedUserName }: ProfileFormProps) {
  const router = useRouter();
  const [buttonState, setButtonState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
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
  const [photoUrls, setPhotoUrls] = useState<string[]>(profile.photo_urls || []);
  const [error, setError] = useState<string | null>(null);

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
    setButtonState('idle');

    // Validate address is required
    if (!address.trim()) {
      setError("Address is required");
      return;
    }

    // Validate all phone numbers (skip empty/whitespace entries)
    const invalidPhone = phones.find(
      (p) => p.number.trim() && !isValidPhone(p.number)
    );
    if (invalidPhone) {
      setError("Phone numbers must be 10 digits");
      return;
    }

    // Validate all email addresses (skip empty/whitespace entries)
    const invalidEmail = emails.find((e) => e.email.trim() && !isValidEmail(e.email));
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

    setButtonState('saving');

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
      photoUrls,
    });

    if (!result.success) {
      setError(result.error || "Failed to save profile");
      setButtonState('error');
    } else {
      setPhones(cleanedPhones.length > 0 ? cleanedPhones : []);
      setEmails(cleanedEmails.length > 0 ? cleanedEmails : []);
      setButtonState('success');
      setTimeout(() => {
        router.back();
      }, 1000);
    }
  };

  return (
    <div className={styles.container}>
      <Link href="/dashboard" className={styles.backButton}>
        <ArrowLeft className={styles.backButtonIcon} />
        Back to Dashboard
      </Link>

      <h1 className={styles.title}>
        {isImpersonating ? `Edit Profile: ${impersonatedUserName || "User"}` : "Edit Profile"}
      </h1>

      {isImpersonating && (
        <p className={styles.impersonationNote}>
          You are editing this profile as a staff admin.
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form} data-testid="profile-form">
        {/* Profile Photo Card */}
        <div className={styles.avatarCard}>
          <AvatarUpload
            userId={userId}
            currentAvatarUrl={avatarUrl}
            name={name || "User"}
            onUploadComplete={(url) => setAvatarUrl(url)}
            onError={(msg) => setError(msg)}
          />
        </div>

        {/* Basic Info Card */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Basic Info</h2>
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>
              Household Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={MAX_LENGTHS.userName}
              className={styles.input}
              placeholder="e.g., The Smith Family"
              data-testid="profile-form-name-input"
            />
          </div>
        </div>

        {/* Address Card */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Address</h2>
          <div className={styles.threeColumn}>
            <div className={styles.inputGroup}>
              <label htmlFor="address" className={styles.label}>
                Street Address *
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                maxLength={MAX_LENGTHS.address}
                className={styles.input}
                placeholder="123 Madison Ave"
                data-testid="profile-form-address-input"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="unit" className={styles.label}>
                Unit
              </label>
              <input
                id="unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={MAX_LENGTHS.unit}
                className={styles.input}
                placeholder="Apt 2B"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="moveInYear" className={styles.label}>
                Move-in Year
              </label>
              <input
                id="moveInYear"
                type="number"
                value={moveInYear}
                onChange={(e) => setMoveInYear(e.target.value)}
                min={1900}
                max={new Date().getFullYear()}
                className={styles.input}
                placeholder="2020"
              />
            </div>
          </div>
        </div>

        {/* Contact Card */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <div className={styles.twoColumn}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Phone Numbers</label>
              <span className={styles.hint}>
                Visible to neighbors.
              </span>

              <div className={styles.phoneList}>
                {phones.map((phone, index) => (
                  <div key={index} className={styles.phoneRow}>
                    <input
                      type="text"
                      value={phone.label}
                      onChange={(e) =>
                        updatePhone(index, "label", e.target.value)
                      }
                      className={styles.phoneLabelInput}
                      placeholder="Label"
                    />
                    <input
                      type="tel"
                      value={phone.number}
                      onChange={(e) =>
                        updatePhone(index, "number", e.target.value)
                      }
                      className={styles.phoneNumberInput}
                      placeholder="555-555-5555"
                      maxLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className={styles.removeButton}
                      aria-label="Remove phone"
                    >
                      &times;
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addPhone}
                  className={styles.addPhoneButton}
                >
                  + Add Phone
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Addresses</label>
              <span className={styles.hint}>
                Visible to neighbors.
              </span>

              <div className={styles.phoneList}>
                {emails.map((emailEntry, index) => (
                  <div key={index} className={styles.phoneRow}>
                    <input
                      type="text"
                      value={emailEntry.label}
                      onChange={(e) =>
                        updateEmail(index, "label", e.target.value)
                      }
                      className={styles.phoneLabelInput}
                      placeholder="Label"
                    />
                    <input
                      type="email"
                      value={emailEntry.email}
                      onChange={(e) =>
                        updateEmail(index, "email", e.target.value)
                      }
                      className={styles.phoneNumberInput}
                      placeholder="email@example.com"
                    />
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className={styles.removeButton}
                      aria-label="Remove email"
                    >
                      &times;
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addEmail}
                  className={styles.addPhoneButton}
                >
                  + Add Email
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Household Card */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Household</h2>
          <div className={styles.twoColumn}>
            <div className={styles.inputGroup}>
              <label htmlFor="children" className={styles.label}>
                Children
              </label>
              <textarea
                id="children"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                maxLength={MAX_LENGTHS.children}
                className={styles.textarea}
                placeholder="e.g., Emma (8), Jack (5)"
                rows={2}
              />
              <span className={styles.hint}>
                Names and ages of children in your household
              </span>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="pets" className={styles.label}>
                Pets
              </label>
              <textarea
                id="pets"
                value={pets}
                onChange={(e) => setPets(e.target.value)}
                maxLength={MAX_LENGTHS.pets}
                className={styles.textarea}
                placeholder="e.g., Golden retriever named Max"
                rows={2}
              />
              <span className={styles.hint}>Pets in your household</span>
            </div>
          </div>
        </div>

        {/* About Card */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>About</h2>
          <div className={styles.inputGroup}>
            <label htmlFor="bio" className={styles.label}>
              About Your Household
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_LENGTHS.userBio}
              className={styles.textarea}
              placeholder="Tell your neighbors a bit about yourselves! Where do you work? What are your hobbies? Any fun facts?"
              rows={4}
              data-testid="profile-form-bio-input"
            />
            {bio.length > MAX_LENGTHS.userBio * 0.8 && (
              <span className={styles.charCount}>
                {bio.length}/{MAX_LENGTHS.userBio}
              </span>
            )}
          </div>
        </div>

        {/* Photos Card */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Photos</h2>
          <ProfileGalleryUpload
            userId={userId}
            photoUrls={photoUrls}
            onPhotosChange={setPhotoUrls}
            onError={setError}
          />
        </div>

        {error && <p className={styles.error} data-testid="profile-form-error">{error}</p>}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={buttonState === 'saving'}
            className={`${styles.button} ${buttonState === 'success' ? styles.buttonSuccess : ''} ${buttonState === 'error' ? styles.buttonError : ''}`}
            data-testid="profile-form-submit-button"
          >
            {buttonState === 'saving' ? "Saving..." :
             buttonState === 'success' ? "Saved!" :
             buttonState === 'error' ? "Failed - Try Again" :
             "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
