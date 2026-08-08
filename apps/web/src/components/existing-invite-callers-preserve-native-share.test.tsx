import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteButton } from "./InviteButton";
import { InviteNudge } from "./InviteNudge";
import { GrowthCard } from "./GrowthCard";

const share = vi.fn();

describe("existing invite callers preserve native share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    share.mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: share,
    });
  });

  it("keeps InviteButton on the native share path without direct QR actions", async () => {
    const user = userEvent.setup();
    render(<InviteButton slug="lakewood-heights" variant="card" />);

    await user.click(screen.getByTestId("invite-button"));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: "Join me on Block Club",
      text: "Join our neighborhood on Block Club",
      url: "http://localhost:3000/join/lakewood-heights",
    });
    expect(screen.queryByTestId("invite-modal")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show QR code" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("neighborhood-admin-qr-button")).not.toBeInTheDocument();
  });

  it("keeps GrowthCard on the native share path without direct QR actions", async () => {
    const user = userEvent.setup();
    render(
      <GrowthCard slug="lakewood-heights" memberCount={4} members={[]} />,
    );

    await user.click(screen.getByTestId("growth-card-share-button"));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: "Join me on Block Club",
      text: "Join our neighborhood on Block Club",
      url: "http://localhost:3000/join/lakewood-heights",
    });
    expect(screen.queryByTestId("invite-modal")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show QR code" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("neighborhood-admin-qr-button")).not.toBeInTheDocument();
  });

  it("keeps InviteNudge on the native share path without direct QR actions", async () => {
    const user = userEvent.setup();
    render(<InviteNudge slug="lakewood-heights" section="directory" />);

    await user.click(screen.getByTestId("invite-nudge-directory-button"));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: "Join me on Block Club",
      text: "Join our neighborhood on Block Club",
      url: "http://localhost:3000/join/lakewood-heights",
    });
    expect(screen.queryByTestId("invite-modal")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show QR code" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("neighborhood-admin-qr-button")).not.toBeInTheDocument();
  });
});
