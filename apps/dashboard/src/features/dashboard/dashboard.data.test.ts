import { describe, expect, it } from "vitest";
import { buildBoardCards } from "./dashboard.data";

describe("dashboard board data", () => {
  it("maps done planning tickets into the done column", () => {
    const cards = buildBoardCards(
      [
        {
          id: "E3-T1",
          title: "Fallback title",
          stakeholderSummary: "Summary",
          owner: "Harry",
          lane: "Backend",
          plannedColumn: "Ready",
          points: 3,
          size: "S",
          labels: ["backend"],
          syncWithPlanning: true
        }
      ],
      new Map([
        [
          "E3-T1",
          {
            id: "E3-T1",
            title: "Define Message Ingestion and Extraction Contract",
            status: "done" as const
          }
        ]
      ])
    );

    expect(cards[0]).toMatchObject({
      id: "E3-T1",
      title: "Define Message Ingestion and Extraction Contract",
      column: "Done"
    });
    expect(cards[0].labels).toEqual(["backend"]);
  });

  it("keeps pending planning tickets in their planned column", () => {
    const cards = buildBoardCards(
      [
        {
          id: "E3-T3",
          title: "Fallback title",
          stakeholderSummary: "Summary",
          owner: "Harry",
          lane: "Backend",
          plannedColumn: "Ready",
          points: 5,
          size: "M",
          labels: ["backend"],
          syncWithPlanning: true
        }
      ],
      new Map([
        [
          "E3-T3",
          {
            id: "E3-T3",
            title: "Implement the Message Ingestion Service",
            status: "pending" as const
          }
        ]
      ])
    );

    expect(cards[0]).toMatchObject({
      id: "E3-T3",
      title: "Implement the Message Ingestion Service",
      column: "Ready"
    });
    expect(cards[0].labels).toEqual(["backend"]);
  });

  it("supports preview-only tickets that are not tracked in planning yet", () => {
    const cards = buildBoardCards(
      [
        {
          id: "E7-T4",
          title: "Build the add-in message work panel",
          stakeholderSummary: "Summary",
          owner: "Tom",
          lane: "Frontend",
          plannedColumn: "Backlog",
          points: 8,
          size: "L",
          labels: ["frontend"]
        }
      ],
      new Map()
    );

    expect(cards[0]).toMatchObject({
      id: "E7-T4",
      title: "Build the add-in message work panel",
      column: "Backlog"
    });
    expect(cards[0].labels).toEqual(["frontend"]);
  });

  it("surfaces tracked ready tickets before preview-only ready tickets", () => {
    const cards = buildBoardCards(
      [
        {
          id: "E7-T1",
          title: "Define add-in prototype flow",
          stakeholderSummary: "Summary",
          owner: "Tom",
          lane: "Design",
          plannedColumn: "Ready",
          points: 3,
          size: "S",
          labels: ["design"]
        },
        {
          id: "E3-T3",
          title: "Fallback title",
          stakeholderSummary: "Summary",
          owner: "Harry",
          lane: "Backend",
          plannedColumn: "Ready",
          points: 5,
          size: "M",
          labels: ["backend"],
          syncWithPlanning: true
        }
      ],
      new Map([
        [
          "E3-T3",
          {
            id: "E3-T3",
            title: "Implement the Message Ingestion Service",
            status: "pending" as const
          }
        ]
      ])
    );

    expect(cards.map((card) => card.id)).toEqual(["E3-T3", "E7-T1"]);
  });

  it("surfaces tracked backlog tickets before preview-only backlog tickets", () => {
    const cards = buildBoardCards(
      [
        {
          id: "E8-T1",
          title: "Define dashboard prototype information architecture",
          stakeholderSummary: "Summary",
          owner: "Tom",
          lane: "Design",
          plannedColumn: "Backlog",
          points: 5,
          size: "M",
          labels: ["design"]
        },
        {
          id: "E3-T4",
          title: "Fallback title",
          stakeholderSummary: "Summary",
          owner: "Harry",
          lane: "Backend",
          plannedColumn: "Backlog",
          points: 5,
          size: "M",
          labels: ["backend"],
          syncWithPlanning: true
        },
        {
          id: "E3-T5",
          title: "Fallback title",
          stakeholderSummary: "Summary",
          owner: "Harry",
          lane: "Backend",
          plannedColumn: "Backlog",
          points: 8,
          size: "L",
          labels: ["backend"],
          syncWithPlanning: true
        }
      ],
      new Map([
        [
          "E3-T4",
          {
            id: "E3-T4",
            title: "Implement Attachment Metadata Retrieval and Durable Linking",
            status: "pending" as const
          }
        ],
        [
          "E3-T5",
          {
            id: "E3-T5",
            title: "Implement PDF-First Attachment Text Extraction",
            status: "pending" as const
          }
        ]
      ])
    );

    expect(cards.map((card) => card.id)).toEqual(["E3-T4", "E3-T5", "E8-T1"]);
  });

  it("shows the most recently completed tracked tickets first in done", () => {
    const cards = buildBoardCards(
      [
        {
          id: "E2-T9",
          title: "Fallback title",
          stakeholderSummary: "Summary",
          owner: "Harry",
          lane: "Backend",
          plannedColumn: "Backlog",
          points: 5,
          size: "M",
          labels: ["backend"],
          syncWithPlanning: true
        },
        {
          id: "E3-T3",
          title: "Fallback title",
          stakeholderSummary: "Summary",
          owner: "Harry",
          lane: "Backend",
          plannedColumn: "Ready",
          points: 5,
          size: "M",
          labels: ["backend"],
          syncWithPlanning: true
        },
        {
          id: "E3-T2",
          title: "Fallback title",
          stakeholderSummary: "Summary",
          owner: "Harry",
          lane: "Backend",
          plannedColumn: "Backlog",
          points: 5,
          size: "M",
          labels: ["backend"],
          syncWithPlanning: true
        }
      ],
      new Map([
        [
          "E2-T9",
          {
            id: "E2-T9",
            title: "Add Shared-Mailbox Readiness and Operational Verification",
            status: "done" as const
          }
        ],
        [
          "E3-T3",
          {
            id: "E3-T3",
            title: "Implement the Message Ingestion Service",
            status: "done" as const
          }
        ],
        [
          "E3-T2",
          {
            id: "E3-T2",
            title: "Extend Persistence for Message Bodies, Attachments, and Extraction State",
            status: "done" as const
          }
        ]
      ])
    );

    expect(cards.map((card) => card.id)).toEqual(["E3-T3", "E3-T2", "E2-T9"]);
  });

  it("fails loudly when a tracked ticket has no planning metadata", () => {
    expect(() =>
      buildBoardCards(
        [
          {
            id: "E2-T1",
            title: "Define Microsoft Entra and Graph connectivity contract",
            stakeholderSummary: "Summary",
            owner: "Harry",
            lane: "Backend",
            plannedColumn: "Ready",
            points: 2,
            size: "S",
            labels: ["backend"],
            syncWithPlanning: true
          }
        ],
        new Map()
      )
    ).toThrow('Dashboard board metadata is missing planning status for tracked ticket "E2-T1".');
  });
});
