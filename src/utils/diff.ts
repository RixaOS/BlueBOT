import diff from "fast-diff";

export function generateTextDiff(oldText: string, newText: string): string {
  const diffs = diff(oldText, newText);

  return diffs
    .map(([type, text]) => {
      switch (type) {
        case diff.INSERT:
          return `**${text}**`; // Highlight insertions with bold
        case diff.DELETE:
          return `~~${text}~~`; // Strike through deletions
        case diff.EQUAL:
        default:
          return text;
      }
    })
    .join("")
    .slice(0, 1024); // Keep within embed field limit
}
