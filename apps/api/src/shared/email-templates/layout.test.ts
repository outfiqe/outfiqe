import { describe, expect, it } from "vitest";

import {
  emailButtonHtml,
  emailDivider,
  emailEyebrow,
  emailHeading,
  emailInfoPanel,
  emailMetaTable,
  emailStatusPill,
  escapeHtml,
  paragraphsHtml,
  renderEmailLayout,
} from "./layout.js";

describe("escapeHtml", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'quote'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Meridian Apparel Co.")).toBe("Meridian Apparel Co.");
  });
});

describe("paragraphsHtml", () => {
  it("splits on blank lines into separate paragraphs", () => {
    const html = paragraphsHtml("First paragraph.\n\nSecond paragraph.");
    expect(html).toContain("First paragraph.");
    expect(html).toContain("Second paragraph.");
    expect(html.match(/<p /g)).toHaveLength(2);
  });

  it("converts single newlines within a paragraph to line breaks", () => {
    expect(paragraphsHtml("Line one\nLine two")).toContain("Line one<br />Line two");
  });

  it("escapes HTML in the input", () => {
    expect(paragraphsHtml("<img onerror=alert(1)>")).not.toContain("<img");
    expect(paragraphsHtml("<img onerror=alert(1)>")).toContain("&lt;img");
  });
});

describe("emailHeading / emailEyebrow", () => {
  it("escapes the provided text", () => {
    expect(emailHeading('<b>"Owner"</b>')).toContain("&lt;b&gt;&quot;Owner&quot;&lt;/b&gt;");
    expect(emailHeading('<b>"Owner"</b>')).not.toContain("<b>");
  });

  it("escapes the eyebrow label", () => {
    expect(emailEyebrow("<script>x</script>")).not.toContain("<script>");
  });
});

describe("emailButtonHtml", () => {
  it("renders the label text and target url", () => {
    const html = emailButtonHtml("Verify email", "https://outfiqe.com/verify?token=abc");
    expect(html).toContain("Verify email");
    expect(html).toContain('href="https://outfiqe.com/verify?token=abc"');
  });

  it("escapes a hostile label", () => {
    expect(emailButtonHtml("<img>", "https://outfiqe.com")).not.toContain("<img>");
  });

  it("never nests a double-quoted font name inside a double-quoted style attribute", () => {
    const html = emailButtonHtml("Verify email", "https://outfiqe.com");
    expect(html).not.toContain('"Segoe UI"');
    expect(html).toContain("'Segoe UI'");
  });
});

describe("emailStatusPill", () => {
  it("always renders the status label as visible text, not color alone", () => {
    expect(emailStatusPill("Suspended", "destructive")).toContain("Suspended");
    expect(emailStatusPill("Approved", "success")).toContain("Approved");
    expect(emailStatusPill("Renewal due", "neutral")).toContain("Renewal due");
  });

  it("escapes the label", () => {
    expect(emailStatusPill("<b>Banned</b>", "destructive")).not.toContain("<b>");
  });
});

describe("emailMetaTable", () => {
  it("renders every row's label and value", () => {
    const html = emailMetaTable([
      { label: "Order ID", value: "ORD-123" },
      { label: "Amount", value: "Rs. 1,000" },
    ]);
    expect(html).toContain("Order ID");
    expect(html).toContain("ORD-123");
    expect(html).toContain("Amount");
    expect(html).toContain("Rs. 1,000");
  });

  it("escapes row labels and values", () => {
    const html = emailMetaTable([{ label: "<b>Label</b>", value: "<i>Value</i>" }]);
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>");
  });

  it("renders nothing for an empty row list", () => {
    expect(emailMetaTable([])).not.toContain("<tr>");
  });
});

describe("emailInfoPanel", () => {
  it("wraps the given html unchanged", () => {
    expect(emailInfoPanel("<p>hello</p>")).toContain("<p>hello</p>");
  });
});

describe("emailDivider", () => {
  it("renders a standalone element usable directly in body flow", () => {
    const html = emailDivider();
    expect(html.trim().startsWith("<div")).toBe(true);
    expect(html).not.toContain("<tr>");
  });
});

describe("renderEmailLayout", () => {
  it("includes the preheader, wordmark, and body html", () => {
    const html = renderEmailLayout({
      preheader: "You have a new notification.",
      bodyHtml: "<p>Body content</p>",
    });
    expect(html).toContain("You have a new notification.");
    expect(html).toContain(">out</span>");
    expect(html).toContain(">fiqe.</span>");
    expect(html).toContain("<p>Body content</p>");
    expect(html).toContain("Outfiqe. Fashion discovery, made in Nepal.");
  });

  it("never nests a double-quoted font name inside a double-quoted style attribute", () => {
    const html = renderEmailLayout({ preheader: "Preheader", bodyHtml: "<p>Body</p>" });
    expect(html).not.toContain('"Segoe UI"');
    expect(html).toContain("'Segoe UI'");
  });

  it("escapes the preheader text", () => {
    const html = renderEmailLayout({
      preheader: "<script>alert(1)</script>",
      bodyHtml: "<p>Body</p>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
