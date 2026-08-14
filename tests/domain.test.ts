import { describe, expect, it } from "vitest";
import { canResolveApproval, canTransition, categoryFromCapture, makeProposal, permissionFromCapture, titleFromCapture } from "@/lib/domain";

describe("Thing state transitions", () => {
  it("allows useful forward movement", () => {
    expect(canTransition("Exploring", "Moving")).toBe(true);
    expect(canTransition("Needs You", "Ready")).toBe(true);
    expect(canTransition("Someday", "Exploring")).toBe(true);
  });

  it("rejects invalid shortcuts", () => {
    expect(canTransition("Done", "Moving")).toBe(false);
    expect(canTransition("Inbox", "Done")).toBe(false);
    expect(canTransition("Waiting", "Ready")).toBe(false);
  });
});

describe("permission boundaries", () => {
  it("only lets an owner resolve approvals", () => {
    expect(canResolveApproval("owner")).toBe(true);
    expect(canResolveApproval("assistant")).toBe(false);
  });

  it("routes money and commitment language to APPROVE", () => {
    expect(permissionFromCapture("Buy that Yeti if it goes on sale")).toBe("APPROVE");
    expect(permissionFromCapture("Research campsite lighting")).toBe("GO");
  });
});

describe("safe deterministic capture review", () => {
  it("finds an obvious related Thing without silently merging", () => {
    const proposal = makeProposal("For camping, find tasteful lights but nothing corny.");
    expect(proposal?.relatedThingId).toBe("camping-red-oak");
    expect(proposal?.title).toBe("Camping — Red Oak");
    expect(proposal?.extracted).toContain("Likely related to Camping — Red Oak");
  });

  it("preserves uncertain trip intent as a reviewable suggestion", () => {
    const raw = "https://example.com/wisconsin-cabin might be fire for fall, look whenever";
    expect(titleFromCapture(raw)).toBe("Wisconsin Cabin Weekend");
    expect(categoryFromCapture(raw)).toBe("Trips & Experiences");
    expect(makeProposal(raw)?.status).toBe("Someday");
  });
});
