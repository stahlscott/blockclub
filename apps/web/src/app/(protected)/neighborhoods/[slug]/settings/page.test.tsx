import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NeighborhoodSettingsPage from "./page";
import { updateNeighborhoodSettings } from "./actions";
import { createClient } from "@/lib/supabase/client";

const { useParams, push, refresh, share } = vi.hoisted(() => ({
  useParams: vi.fn(() => ({ slug: "lakewood-heights" })),
  push: vi.fn(),
  refresh: vi.fn(),
  share: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams,
  useRouter: () => ({ push, refresh }),
}));

vi.mock("./actions", () => ({
  updateNeighborhoodSettings: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

function createQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return query;
}

describe("NeighborhoodSettingsPage invite actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: share,
    });
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-user" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) =>
        createQuery(
          table === "neighborhoods"
            ? {
                id: "neighborhood-id",
                slug: "lakewood-heights",
                name: "Lakewood Heights",
                description: "A friendly neighborhood",
                location: "Northwest",
                settings: { require_approval: true },
              }
            : { role: "admin" },
        ),
      ),
    } as never);
    vi.mocked(updateNeighborhoodSettings).mockResolvedValue({ success: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ isStaffAdmin: false }),
      }),
    );
  });

  it("renders the admin invite actions in the real loaded admin path", async () => {
    const user = userEvent.setup();
    render(<NeighborhoodSettingsPage />);

    const adminActions = await screen.findByTestId("neighborhood-admin-actions");
    const inviteHeading = within(adminActions).getByRole("heading", {
      name: "Invite neighbors",
    });
    const shareButton = within(adminActions).getByTestId(
      "neighborhood-admin-share-button",
    );
    const qrButton = within(adminActions).getByTestId(
      "neighborhood-admin-qr-button",
    );

    expect(inviteHeading).toBeInTheDocument();
    expect(shareButton).toHaveTextContent("Share Invite");
    expect(qrButton).toHaveTextContent("Show QR code");
    expect(shareButton).toHaveAttribute("type", "button");
    expect(qrButton).toHaveAttribute("type", "button");

    const pendingLink = within(adminActions).getByTestId(
      "neighborhood-admin-pending-link",
    );
    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    pendingLink.focus();
    await user.tab();
    expect(document.activeElement).toBe(shareButton);
    await user.tab();
    expect(document.activeElement).toBe(qrButton);
    await user.tab();
    expect(document.activeElement).toBe(saveButton);

    await user.click(qrButton);
    expect(updateNeighborhoodSettings).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(screen.getByTestId("invite-modal")).toBeInTheDocument();
    expect(screen.getByTestId("invite-qr-code")).toHaveAttribute(
      "data-value",
      "http://localhost:3000/join/lakewood-heights",
    );
    expect(
      screen.getByText("http://localhost:3000/join/lakewood-heights"),
    ).toBeInTheDocument();
  });

  it("does not submit the settings form from either invite action", async () => {
    const user = userEvent.setup();
    render(<NeighborhoodSettingsPage />);
    const adminActions = await screen.findByTestId("neighborhood-admin-actions");

    await user.click(
      within(adminActions).getByTestId("neighborhood-admin-share-button"),
    );
    expect(updateNeighborhoodSettings).not.toHaveBeenCalled();
    expect(screen.queryByTestId("invite-modal")).not.toBeInTheDocument();

    await user.click(
      within(adminActions).getByTestId("neighborhood-admin-qr-button"),
    );

    expect(updateNeighborhoodSettings).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("invite-modal")).toBeInTheDocument());
  });
});
