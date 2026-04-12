export type BoardColumn = "Backlog" | "Ready" | "In Progress" | "Blocked" | "Done";
export type Lane = "Design" | "Frontend" | "Backend";
export type Person = "Tom" | "Dick" | "Harry";
export type BoardView = "Master" | Person;

export type BoardCard = {
  id: string;
  title: string;
  stakeholderSummary: string;
  owner: Person;
  lane: Lane;
  column: BoardColumn;
  points: number;
  size: "S" | "M" | "L" | "XL";
  labels: string[];
  trackedInPlanning?: boolean;
};
