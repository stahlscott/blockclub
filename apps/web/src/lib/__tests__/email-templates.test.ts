import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loanRequestedTemplate,
  loanApprovedTemplate,
  loanDeclinedTemplate,
  loanReturnedTemplate,
} from "../email/templates";
import type { LoanNotificationData } from "../email/types";

// Mock the service module to control getAppUrl
vi.mock("../email/service", () => ({
  getAppUrl: () => "https://test.blockclub.app",
}));

const baseLoanData: LoanNotificationData = {
  loanId: "loan-123",
  itemId: "item-456",
  itemName: "Circular Saw",
  borrowerName: "Jane Doe",
  ownerName: "John Smith",
  neighborhoodSlug: "lakewood-heights",
  notes: null,
  dueDate: null,
};

describe("loanRequestedTemplate", () => {
  it("generates correct subject line", () => {
    const result = loanRequestedTemplate(baseLoanData);
    expect(result.subject).toBe("Jane Doe wants to borrow your Circular Saw");
  });

  it("includes borrower name in body", () => {
    const result = loanRequestedTemplate(baseLoanData);
    expect(result.html).toContain("Jane Doe");
  });

  it("includes owner name in greeting", () => {
    const result = loanRequestedTemplate(baseLoanData);
    expect(result.html).toContain("Hi John Smith");
  });

  it("includes item name in body", () => {
    const result = loanRequestedTemplate(baseLoanData);
    expect(result.html).toContain("Circular Saw");
  });

  it("includes correct item URL", () => {
    const result = loanRequestedTemplate(baseLoanData);
    expect(result.html).toContain(
      "https://test.blockclub.app/neighborhoods/lakewood-heights/library/item-456"
    );
  });

  it("includes notes when provided", () => {
    const dataWithNotes = {
      ...baseLoanData,
      notes: "I need this for a weekend project",
    };
    const result = loanRequestedTemplate(dataWithNotes);
    expect(result.html).toContain("I need this for a weekend project");
  });

  it("excludes notes section when no notes", () => {
    const result = loanRequestedTemplate(baseLoanData);
    // Should not have the notes blockquote styling
    expect(result.html).not.toContain("font-style: italic");
  });

  it("includes Review Request CTA", () => {
    const result = loanRequestedTemplate(baseLoanData);
    expect(result.html).toContain("Review Request");
  });

  it("includes Block Club header", () => {
    const result = loanRequestedTemplate(baseLoanData);
    expect(result.html).toContain("Block Club");
  });

  it("includes notification settings link in footer", () => {
    const result = loanRequestedTemplate(baseLoanData);
    expect(result.html).toContain("https://test.blockclub.app/settings/notifications");
  });
});

describe("loanApprovedTemplate", () => {
  it("generates correct subject line", () => {
    const result = loanApprovedTemplate(baseLoanData);
    expect(result.subject).toBe("Your request for Circular Saw was approved!");
  });

  it("includes borrower name in greeting", () => {
    const result = loanApprovedTemplate(baseLoanData);
    expect(result.html).toContain("Hi Jane Doe");
  });

  it("includes owner name who approved", () => {
    const result = loanApprovedTemplate(baseLoanData);
    expect(result.html).toContain("John Smith");
    expect(result.html).toContain("has approved your request");
  });

  it("shows no due date message when dueDate is null", () => {
    const result = loanApprovedTemplate(baseLoanData);
    expect(result.html).toContain("no set due date");
  });

  it("shows due date when provided", () => {
    const dataWithDueDate = {
      ...baseLoanData,
      dueDate: "March 15, 2024",
    };
    const result = loanApprovedTemplate(dataWithDueDate);
    expect(result.html).toContain("March 15, 2024");
    expect(result.html).toContain("return it by");
  });

  it("includes View Item CTA", () => {
    const result = loanApprovedTemplate(baseLoanData);
    expect(result.html).toContain("View Item");
  });

  it("mentions contacting owner for pickup", () => {
    const result = loanApprovedTemplate(baseLoanData);
    expect(result.html).toContain("Contact John Smith to arrange pickup");
  });
});

describe("loanDeclinedTemplate", () => {
  it("generates neutral subject line", () => {
    const result = loanDeclinedTemplate(baseLoanData);
    expect(result.subject).toBe("Update on your request for Circular Saw");
  });

  it("includes borrower name in greeting", () => {
    const result = loanDeclinedTemplate(baseLoanData);
    expect(result.html).toContain("Hi Jane Doe");
  });

  it("uses polite language about declining", () => {
    const result = loanDeclinedTemplate(baseLoanData);
    expect(result.html).toContain("unable to lend");
  });

  it("includes Browse Library CTA", () => {
    const result = loanDeclinedTemplate(baseLoanData);
    expect(result.html).toContain("Browse Library");
  });

  it("links to library page, not item page", () => {
    const result = loanDeclinedTemplate(baseLoanData);
    expect(result.html).toContain(
      "https://test.blockclub.app/neighborhoods/lakewood-heights/library"
    );
    // Should not link directly to the declined item
    expect(result.html).not.toContain(`library/${baseLoanData.itemId}`);
  });

  it("encourages browsing other items", () => {
    const result = loanDeclinedTemplate(baseLoanData);
    expect(result.html).toContain("other items");
  });
});

describe("loanReturnedTemplate", () => {
  it("generates correct subject line", () => {
    const result = loanReturnedTemplate(baseLoanData);
    expect(result.subject).toBe("Circular Saw has been returned");
  });

  it("includes owner name in greeting", () => {
    const result = loanReturnedTemplate(baseLoanData);
    expect(result.html).toContain("Hi John Smith");
  });

  it("mentions who borrowed the item", () => {
    const result = loanReturnedTemplate(baseLoanData);
    expect(result.html).toContain("borrowed by");
    expect(result.html).toContain("Jane Doe");
  });

  it("mentions item is now available", () => {
    const result = loanReturnedTemplate(baseLoanData);
    expect(result.html).toContain("now available");
  });

  it("includes View Item CTA", () => {
    const result = loanReturnedTemplate(baseLoanData);
    expect(result.html).toContain("View Item");
  });

  it("links to item page", () => {
    const result = loanReturnedTemplate(baseLoanData);
    expect(result.html).toContain(
      "https://test.blockclub.app/neighborhoods/lakewood-heights/library/item-456"
    );
  });
});

describe("template HTML structure", () => {
  it("all templates have valid HTML doctype", () => {
    const templates = [
      loanRequestedTemplate(baseLoanData),
      loanApprovedTemplate(baseLoanData),
      loanDeclinedTemplate(baseLoanData),
      loanReturnedTemplate(baseLoanData),
    ];

    for (const template of templates) {
      expect(template.html).toContain("<!DOCTYPE html>");
      expect(template.html).toContain("<html");
      expect(template.html).toContain("</html>");
    }
  });

  it("all templates include preheader for inbox preview", () => {
    const templates = [
      loanRequestedTemplate(baseLoanData),
      loanApprovedTemplate(baseLoanData),
      loanDeclinedTemplate(baseLoanData),
      loanReturnedTemplate(baseLoanData),
    ];

    for (const template of templates) {
      // Preheader is hidden span at the start
      expect(template.html).toContain("display: none");
    }
  });

  it("all templates have accessible lang attribute", () => {
    const templates = [
      loanRequestedTemplate(baseLoanData),
      loanApprovedTemplate(baseLoanData),
      loanDeclinedTemplate(baseLoanData),
      loanReturnedTemplate(baseLoanData),
    ];

    for (const template of templates) {
      expect(template.html).toContain('lang="en"');
    }
  });
});
