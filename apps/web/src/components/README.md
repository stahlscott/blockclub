# Components

Shared React components used across the web application.

## Current Components

| Component | Type | Purpose |
|-----------|------|---------|
| `AuthProvider` | Context | Client-side auth state management |
| `Header` | Layout | Global navigation with mobile support |
| `NeighborhoodSwitcher` | Feature | Dropdown to switch primary neighborhood |
| `InviteButton` | Feature | Copy invite link to clipboard |
| `OptimizedImage` | UI | Next.js Image wrapper with fallback |
| `AvatarUpload` | Form | User avatar upload with preview |
| `ItemPhotoUpload` | Form | Multi-photo upload for library items |

## When to Create a Component

Create a shared component when:
- Used in **3+ places** across the app
- Has **complex logic** worth encapsulating
- Needs **consistent styling** across usages

Keep code inline when:
- It's only used **once or twice**
- It's simple JSX without complex logic
- It's page-specific layout

## Component Structure

```
components/
├── ComponentName.tsx       # Component implementation
├── ComponentName.module.css # Styles (if CSS Module)
└── README.md               # This file
```

For components with CSS Modules, colocate the styles:
```typescript
// Header.tsx
import styles from "./Header.module.css";
```

## Naming Conventions

- **Files**: PascalCase (`NeighborhoodSwitcher.tsx`)
- **Components**: PascalCase function names
- **Props**: `ComponentNameProps` interface
- **Styles**: camelCase class names in CSS Modules

## Component Patterns

### Server vs Client

Most components here are **client components** because they need interactivity.

```typescript
"use client";  // Add when using hooks, events, or browser APIs

export function InteractiveComponent() {
  const [state, setState] = useState();
  // ...
}
```

### Props Pattern

```typescript
interface ButtonProps {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = "primary", children, onClick }: ButtonProps) {
  // ...
}
```

### Context Provider Pattern

```typescript
// Provider wraps children
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={...}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for consumers
export function useAuth() {
  return useContext(AuthContext);
}
```

## Styling

Components use either:

1. **CSS Modules** - For complex styling with pseudo-classes/media queries
2. **Inline styles** - For simple, one-off styling

See `globals.css` for available CSS variables (colors, spacing, etc).

## Future Organization

When the component count grows significantly (15+), consider reorganizing into:
```
components/
├── ui/        # Primitives (Button, Card, Badge, Input)
├── layout/    # Layout components (Header, PageContainer)
├── forms/     # Form components (AvatarUpload, FormField)
└── features/  # Feature-specific (NeighborhoodSwitcher, InviteButton)
```
