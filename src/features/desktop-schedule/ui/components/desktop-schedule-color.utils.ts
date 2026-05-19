export function normalizeHexColor(colorHex: string) {
  const sanitized = colorHex.trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(sanitized)) {
    return sanitized
      .split("")
      .map((character) => `${character}${character}`)
      .join("");
  }
  return /^[0-9a-fA-F]{6}$/.test(sanitized) ? sanitized : "2563eb";
}

export function toAlphaColor(colorHex: string, alpha: number) {
  const normalizedHex = normalizeHexColor(colorHex);
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function mixHexWithWhite(colorHex: string, colorWeight: number) {
  const normalizedHex = normalizeHexColor(colorHex);
  const clampedWeight = Math.min(Math.max(colorWeight, 0), 1);
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  const mixedRed = Math.round(255 - (255 - red) * clampedWeight);
  const mixedGreen = Math.round(255 - (255 - green) * clampedWeight);
  const mixedBlue = Math.round(255 - (255 - blue) * clampedWeight);
  return `rgb(${mixedRed}, ${mixedGreen}, ${mixedBlue})`;
}
