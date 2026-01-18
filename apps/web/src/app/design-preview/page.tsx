// Design preview page for testing fonts

// Font options to preview
const fonts = [
  {
    name: "System UI (Current)",
    family:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    description: "Default system fonts - familiar, no loading delay",
    googleFont: null,
  },
  {
    name: "Inter",
    family: '"Inter", system-ui, sans-serif',
    description: "Modern, highly readable, popular choice for web apps",
    googleFont: "Inter:wght@400;500;600;700",
  },
  {
    name: "Plus Jakarta Sans",
    family: '"Plus Jakarta Sans", system-ui, sans-serif',
    description: "Friendly geometric sans-serif, slightly warmer feel",
    googleFont: "Plus+Jakarta+Sans:wght@400;500;600;700",
  },
  {
    name: "Nunito",
    family: '"Nunito", system-ui, sans-serif',
    description: "Rounded terminals, very friendly and approachable",
    googleFont: "Nunito:wght@400;500;600;700",
  },
  {
    name: "DM Sans",
    family: '"DM Sans", system-ui, sans-serif',
    description: "Clean geometric, low contrast, modern",
    googleFont: "DM+Sans:wght@400;500;600;700",
  },
];

// Current chosen theme colors
const colors = {
  primary: "#7c3aed",
  primaryLight: "#f3f0ff",
  background: "#fafaf9",
  surface: "#ffffff",
  text: "#18181b",
  textSecondary: "#52525b",
  textMuted: "#a1a1aa",
  border: "#e4e4e7",
  borderEmphasis: "#c4b5fd",
};

function FontPreviewCard({ font }: { font: (typeof fonts)[0] }) {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: "12px",
        padding: "24px",
        border: `1px solid ${colors.border}`,
        fontFamily: font.family,
      }}
    >
      {/* Font Name */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3
            style={{
              color: colors.text,
              fontSize: "1.25rem",
              fontWeight: 600,
              margin: 0,
            }}
          >
            {font.name}
          </h3>
          <p
            style={{
              color: colors.textSecondary,
              fontSize: "0.875rem",
              margin: "4px 0 0 0",
            }}
          >
            {font.description}
          </p>
        </div>
        {font.googleFont && (
          <span
            style={{
              fontSize: "0.75rem",
              color: colors.textMuted,
              background: colors.background,
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            Google Fonts
          </span>
        )}
      </div>

      {/* Sample Text */}
      <div
        style={{
          background: colors.background,
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <p
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: colors.text,
            margin: "0 0 8px 0",
            lineHeight: 1.2,
          }}
        >
          Block Club
        </p>
        <p
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: colors.text,
            margin: "0 0 8px 0",
          }}
        >
          Your neighborhood lending library
        </p>
        <p
          style={{
            fontSize: "0.9375rem",
            color: colors.textSecondary,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Share tools, books, and more with your neighbors. Build community one
          borrow at a time.
        </p>
      </div>

      {/* Weight Samples */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <span
            style={{ fontWeight: 400, fontSize: "1.125rem", color: colors.text }}
          >
            Aa
          </span>
          <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>
            Regular
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <span
            style={{ fontWeight: 500, fontSize: "1.125rem", color: colors.text }}
          >
            Aa
          </span>
          <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>
            Medium
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <span
            style={{ fontWeight: 600, fontSize: "1.125rem", color: colors.text }}
          >
            Aa
          </span>
          <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>
            Semibold
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <span
            style={{ fontWeight: 700, fontSize: "1.125rem", color: colors.text }}
          >
            Aa
          </span>
          <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>Bold</div>
        </div>
      </div>

      {/* UI Elements Preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <button
          style={{
            background: colors.primary,
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "0.875rem",
            fontFamily: font.family,
            cursor: "pointer",
          }}
        >
          Primary Button
        </button>
        <button
          style={{
            background: colors.surface,
            color: colors.primary,
            border: `1px solid ${colors.borderEmphasis}`,
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "0.875rem",
            fontFamily: font.family,
            cursor: "pointer",
          }}
        >
          Secondary
        </button>
        <span
          style={{
            background: colors.surface,
            color: colors.primary,
            border: `1px solid ${colors.borderEmphasis}`,
            padding: "4px 12px",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 500,
          }}
        >
          Category Pill
        </span>
      </div>
    </div>
  );
}

export default function DesignPreviewPage() {
  // Build Google Fonts URL
  const googleFontsUrl = `https://fonts.googleapis.com/css2?${fonts
    .filter((f) => f.googleFont)
    .map((f) => `family=${f.googleFont}`)
    .join("&")}&display=swap`;

  return (
    <>
      {/* Load Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link href={googleFontsUrl} rel="stylesheet" />

      <div
        style={{
          minHeight: "100vh",
          background: "#f0f0f0",
          padding: "40px 20px",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "8px",
              color: "#111",
            }}
          >
            Font Options
          </h1>
          <p style={{ color: "#666", marginBottom: "32px", maxWidth: "600px" }}>
            Compare how different fonts look with the purple theme. Each card
            shows the font at various weights and in UI elements.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {fonts.map((font) => (
              <FontPreviewCard key={font.name} font={font} />
            ))}
          </div>

          {/* Comparison Table */}
          <div
            style={{
              marginTop: "40px",
              padding: "24px",
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Quick Comparison
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e5e5" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>
                    Font
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>
                    Character
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>
                    Best For
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>
                    System UI
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Native feel, varies by OS
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Fastest load, familiar to users
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>Inter</td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Neutral, highly legible
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Professional apps, dense UI
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>
                    Plus Jakarta Sans
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Warm, geometric, friendly
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Modern apps, startup feel
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>
                    Nunito
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Rounded, very approachable
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Community apps, friendly vibes
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>
                    DM Sans
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Clean, low contrast
                  </td>
                  <td style={{ padding: "8px 12px", color: "#666" }}>
                    Minimal design, modern look
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
