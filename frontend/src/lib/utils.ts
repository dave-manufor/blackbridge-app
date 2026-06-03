import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getContrastingTextColor(hexcolor: string) {
  if (!hexcolor) {
    return "#000000"; // Default to black if no color is provided
  }

  // If a hex color is provided, remove the '#' and convert to RGB
  const r = parseInt(hexcolor.substring(1, 3), 16);
  const g = parseInt(hexcolor.substring(3, 5), 16);
  const b = parseInt(hexcolor.substring(5, 7), 16);

  // Calculate luminance (YIQ equation)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  // Return black for bright colors, white for dark colors
  return yiq >= 128 ? "#000000" : "#FFFFFF";
}

