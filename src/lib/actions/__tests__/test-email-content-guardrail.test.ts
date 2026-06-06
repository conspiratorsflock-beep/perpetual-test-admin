import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Hard guardrail (product requirement): the internal Test Email Dashboard must NEVER
 * read email content. `test_email_messages` is only ever queried for non-content
 * columns (id, mailbox_id, received_at, read). This test fails if any content column
 * name appears in the test-email data layer, so the guarantee can't silently regress.
 */
const CONTENT_COLUMNS = ["body_text", "body_html", "subject", "from_address", "from_name"];

describe("Test Email content guardrail", () => {
  it("test-email.ts never references email-content columns", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/actions/test-email.ts"),
      "utf8"
    );
    for (const col of CONTENT_COLUMNS) {
      expect(src, `test-email.ts must not reference content column "${col}"`).not.toContain(col);
    }
  });
});
