const sectorKeywords: Record<string, string[]> = {
  Defence: ["defence", "military", "missile"],
  Energy: ["oil", "gas", "crude"],
  Banking: ["bank", "rbi", "loan"],
  IT: ["tech", "software", "ai"]
};

export function mapToSector(text: string): string {
  const lower = text.toLowerCase();

  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      return sector;
    }
  }

  return "Other";
}

export function scoreSectors(data: any[]) {
  const scores: Record<string, number> = {};

  for (const item of data) {
    const sector = mapToSector(item.text);
    const score = item.sentiment === "positive" ? item.confidence : -item.confidence;

    scores[sector] = (scores[sector] || 0) + score;
  }

  return Object.entries(scores).sort((a, b) => b[1] - a[1]);
}