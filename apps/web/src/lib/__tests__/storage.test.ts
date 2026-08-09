import { describe, it, expect } from "vitest";
import { getPathFromUrl, isAllowedStorageImageUrl, validateImageFile } from "../storage";

describe("getPathFromUrl", () => {
  const baseUrl = "https://example.supabase.co/storage/v1/object/public";

  describe("avatars bucket", () => {
    it("extracts path from valid avatar URL", () => {
      const url = `${baseUrl}/avatars/user-123/1704067200000.jpg`;
      expect(getPathFromUrl(url, "avatars")).toBe("user-123/1704067200000.jpg");
    });

    it("extracts path with nested folders", () => {
      const url = `${baseUrl}/avatars/user-123/folder/image.png`;
      expect(getPathFromUrl(url, "avatars")).toBe("user-123/folder/image.png");
    });

    it("returns null for items bucket URL when looking for avatars", () => {
      const url = `${baseUrl}/items/user-123/1704067200000.jpg`;
      expect(getPathFromUrl(url, "avatars")).toBeNull();
    });
  });

  describe("items bucket", () => {
    it("extracts path from valid items URL", () => {
      const url = `${baseUrl}/items/user-456/1704067200000.webp`;
      expect(getPathFromUrl(url, "items")).toBe("user-456/1704067200000.webp");
    });

    it("returns null for avatars bucket URL when looking for items", () => {
      const url = `${baseUrl}/avatars/user-123/image.jpg`;
      expect(getPathFromUrl(url, "items")).toBeNull();
    });
  });

  describe("posts bucket", () => {
    it("extracts path from valid posts URL", () => {
      const url = `${baseUrl}/posts/user-789/1704067200000.gif`;
      expect(getPathFromUrl(url, "posts")).toBe("user-789/1704067200000.gif");
    });
  });

  describe("edge cases", () => {
    it("returns null for completely invalid URL", () => {
      expect(getPathFromUrl("not-a-url", "avatars")).toBeNull();
    });

    it("returns null for URL without storage path", () => {
      expect(getPathFromUrl("https://example.com/image.jpg", "avatars")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(getPathFromUrl("", "avatars")).toBeNull();
    });

    it("handles URL with special characters in path", () => {
      const url = `${baseUrl}/avatars/user-123/my%20image.jpg`;
      expect(getPathFromUrl(url, "avatars")).toBe("user-123/my%20image.jpg");
    });
  });
});

describe("isAllowedStorageImageUrl", () => {
  const origin = "https://example.supabase.co";

  it("image_url_validation_rejects_untrusted_origin", () => {
    expect(isAllowedStorageImageUrl("https://evil.example/image.png", origin)).toBe(false);
    expect(isAllowedStorageImageUrl("https://example.supabase.co/storage/v1/object/public/posts/post/image.png", origin)).toBe(true);
    expect(isAllowedStorageImageUrl("https://example.supabase.co/storage/v1/object/public/items/item/image.png", origin, "items")).toBe(true);
    expect(isAllowedStorageImageUrl("https://example.supabase.co/storage/v1/object/public/items/item/image.png", origin, "posts")).toBe(false);
    expect(isAllowedStorageImageUrl("https://example.supabase.co/profile/image.png", origin)).toBe(false);
    expect(isAllowedStorageImageUrl("not-a-url", origin)).toBe(false);
    expect(isAllowedStorageImageUrl(null, origin)).toBe(true);
  });
});

describe("validateImageFile", () => {
  // Helper to create mock File objects
  const createMockFile = (name: string, type: string, sizeBytes: number): File => {
    const blob = new Blob(["x".repeat(sizeBytes)], { type });
    return new File([blob], name, { type });
  };

  describe("valid file types", () => {
    it("accepts JPEG images", () => {
      const file = createMockFile("photo.jpg", "image/jpeg", 1000);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("accepts PNG images", () => {
      const file = createMockFile("photo.png", "image/png", 1000);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("accepts WebP images", () => {
      const file = createMockFile("photo.webp", "image/webp", 1000);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("rejects GIF images for new uploads", () => {
      const file = createMockFile("animation.gif", "image/gif", 1000);
      expect(validateImageFile(file)).toEqual({ valid: false, error: "GIF images are not supported for new uploads." });
    });
  });

  describe("invalid file types", () => {
    it("rejects PDF files", () => {
      const file = createMockFile("document.pdf", "application/pdf", 1000);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please select a JPEG, PNG, or WebP image");
    });

    it("rejects SVG files", () => {
      const file = createMockFile("icon.svg", "image/svg+xml", 1000);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
    });

    it("rejects text files", () => {
      const file = createMockFile("notes.txt", "text/plain", 1000);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
    });

    it("rejects BMP images", () => {
      const file = createMockFile("image.bmp", "image/bmp", 1000);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
    });
  });

  describe("file size validation", () => {
    it("accepts file under default 5MB limit", () => {
      const file = createMockFile("photo.jpg", "image/jpeg", 4 * 1024 * 1024);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("accepts file exactly at 5MB limit", () => {
      const file = createMockFile("photo.jpg", "image/jpeg", 5 * 1024 * 1024);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("rejects file over default 5MB limit", () => {
      const file = createMockFile("photo.jpg", "image/jpeg", 5 * 1024 * 1024 + 1);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Image must be less than 5MB");
    });

    it("respects custom size limit", () => {
      const file = createMockFile("photo.jpg", "image/jpeg", 2 * 1024 * 1024);
      expect(validateImageFile(file, 1)).toEqual({
        valid: false,
        error: "Image must be less than 1MB",
      });
    });

    it("accepts file under custom size limit", () => {
      const file = createMockFile("photo.jpg", "image/jpeg", 500 * 1024);
      expect(validateImageFile(file, 1)).toEqual({ valid: true });
    });

    it("allows larger files with higher limit", () => {
      const file = createMockFile("photo.jpg", "image/jpeg", 8 * 1024 * 1024);
      expect(validateImageFile(file, 10)).toEqual({ valid: true });
    });
  });

  describe("combined validation", () => {
    it("checks type before size", () => {
      // Invalid type but valid size - should fail on type
      const file = createMockFile("document.pdf", "application/pdf", 1000);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("JPEG, PNG, or WebP");
    });
  });
});
