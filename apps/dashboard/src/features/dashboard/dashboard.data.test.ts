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
