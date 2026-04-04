export function getLabelTone(label: string) {
  if (label === "design") {
    return "design";
  }
  if (label === "frontend") {
    return "frontend";
  }
  if (label === "backend") {
    return "backend";
  }
  if (label.startsWith("priority:P0")) {
    return "priority-high";
  }
  if (label.startsWith("priority:")) {
    return "priority";
  }
  if (label.startsWith("risk:")) {
    return "risk";
  }
  return "default";
}

export function sortLabels(labels: string[]) {
  return [...labels].sort((left, right) => {
    const rank = (label: string) => {
      if (label === "design" || label === "frontend" || label === "backend") {
        return 0;
      }
      if (label.startsWith("priority:")) {
        return 1;
      }
      if (label.startsWith("type:")) {
        return 2;
      }
      if (label.startsWith("risk:")) {
        return 3;
      }
      if (label.startsWith("epic:")) {
        return 4;
      }
      if (label.startsWith("surface:")) {
        return 5;
      }
      if (label.startsWith("integration:")) {
        return 6;
      }
      return 7;
    };

    return rank(left) - rank(right) || left.localeCompare(right);
  });
}
