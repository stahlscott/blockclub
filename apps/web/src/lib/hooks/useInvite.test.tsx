import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInvite } from "./useInvite";

function InviteHarness({ slug = "lakewood-heights" }: { slug?: string }) {
  const { handleInvite, handleShowQR, modal } = useInvite(slug);

  return (
    <>
      <button type="button" onClick={() => void handleInvite()}>
        Share Invite
      </button>
      <button type="button" onClick={handleShowQR}>
        Show QR code
      </button>
      {modal}
    </>
  );
}

const originalNavigator = globalThis.navigator;

function stubNavigatorShare(share?: typeof navigator.share) {
  const navigatorMock = Object.create(originalNavigator) as Navigator;
  Object.defineProperty(navigatorMock, "share", {
    configurable: true,
    value: share,
  });
  vi.stubGlobal("navigator", navigatorMock);
}

describe("useInvite", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
    stubNavigatorShare(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  it("uses native share without opening the QR modal", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigatorShare(share);
    const user = userEvent.setup();

    render(<InviteHarness />);
    await user.click(screen.getByRole("button", { name: "Share Invite" }));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: "Join me on Block Club",
      text: "Join our neighborhood on Block Club",
      url: "http://localhost:3000/join/lakewood-heights",
    });
    expect(screen.queryByTestId("invite-modal")).not.toBeInTheDocument();
  });

  it("falls back to the QR modal when native share is unavailable", async () => {
    const user = userEvent.setup();

    render(<InviteHarness />);
    await user.click(screen.getByRole("button", { name: "Share Invite" }));

    expect(screen.getByTestId("invite-modal")).toBeInTheDocument();
    expect(screen.getByTestId("invite-qr-code")).toHaveAttribute(
      "data-value",
      "http://localhost:3000/join/lakewood-heights",
    );
  });

  it("opens the QR modal directly without invoking native share", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigatorShare(share);
    const user = userEvent.setup();

    render(<InviteHarness />);
    await user.click(screen.getByRole("button", { name: "Show QR code" }));

    expect(share).not.toHaveBeenCalled();
    expect(screen.getByTestId("invite-modal")).toBeInTheDocument();
    expect(screen.getByTestId("invite-qr-code")).toHaveAttribute(
      "id",
      "invite-qr-canvas",
    );
    expect(screen.getByTestId("invite-qr-code")).toHaveAttribute(
      "data-value",
      "http://localhost:3000/join/lakewood-heights",
    );
    expect(screen.getByText("http://localhost:3000/join/lakewood-heights")).toBeInTheDocument();
  });

  it("does not open the modal after native-share abort", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("", "AbortError"));
    stubNavigatorShare(share);
    const user = userEvent.setup();

    render(<InviteHarness />);
    await user.click(screen.getByRole("button", { name: "Share Invite" }));

    expect(share).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("invite-modal")).not.toBeInTheDocument();
  });

  it("falls back after a non-abort native-share error", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("", "DataError"));
    stubNavigatorShare(share);
    const user = userEvent.setup();

    render(<InviteHarness />);
    await user.click(screen.getByRole("button", { name: "Share Invite" }));

    expect(screen.getByTestId("invite-modal")).toBeInTheDocument();
  });

  it("keeps modal controls and restores body scroll after close", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "scroll";

    render(<InviteHarness />);
    await user.click(screen.getByRole("button", { name: "Show QR code" }));

    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByTestId("invite-modal-copy-button")).toBeInTheDocument();
    expect(screen.getByTestId("invite-modal-download-button")).toBeInTheDocument();

    await user.click(screen.getByTestId("invite-modal-close-button"));

    expect(screen.queryByTestId("invite-modal")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("looks up the existing QR canvas target for download", async () => {
    const user = userEvent.setup();
    const getElementById = vi.spyOn(document, "getElementById");
    Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
      configurable: true,
      value: vi.fn(() => "data:image/png;base64,mock"),
    });
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      configurable: true,
      value: vi.fn(),
    });

    render(<InviteHarness slug="lakewood-heights" />);
    await user.click(screen.getByRole("button", { name: "Show QR code" }));
    await user.click(screen.getByTestId("invite-modal-download-button"));

    expect(getElementById).toHaveBeenCalledWith("invite-qr-canvas");
  });

  it("restores body scroll after Escape dismissal", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "auto";

    render(<InviteHarness />);
    await user.click(screen.getByRole("button", { name: "Show QR code" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("invite-modal")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("auto");
  });
});
