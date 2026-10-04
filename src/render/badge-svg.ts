// The "built by voice │ N prompts" README badge (FR-33, ARCHITECTURE §10): a flat
// two-part SVG with no external fonts, images or links.
import { formatCount } from "../format.js";

/** Width estimate for an 11 px Verdana-like font. */
const CHAR_WIDTH = 7;
const PADDING = 6;
const HEIGHT = 20;
const FONT = "Verdana,Geneva,DejaVu Sans,sans-serif";
// DESIGN §2.1: ink for the label, accent (the voice) for the count. White text passes AA on both.
const LABEL_FILL = "#1C1917";
const VALUE_FILL = "#5B4BC4";

export const BADGE_LABEL = "built by voice";

export const promptCountText = (prompts: number) => `${formatCount(prompts)} ${prompts === 1 ? "prompt" : "prompts"}`;

const segmentWidth = (text: string) => text.length * CHAR_WIDTH + 2 * PADDING;

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function badgeSvg(prompts: number): string {
  const value = promptCountText(prompts);
  const left = segmentWidth(BADGE_LABEL);
  const right = segmentWidth(value);
  const width = left + right;
  const title = escapeXml(`${BADGE_LABEL}: ${value}`);
  const text = (x: number, content: string) =>
    `<text x="${x}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(content)}</text>` +
    `<text x="${x}" y="14">${escapeXml(content)}</text>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" role="img" aria-label="${title}">`,
    `<title>${title}</title>`,
    `<clipPath id="said-badge-round"><rect width="${width}" height="${HEIGHT}" rx="3"/></clipPath>`,
    `<g clip-path="url(#said-badge-round)">`,
    `<rect width="${left}" height="${HEIGHT}" fill="${LABEL_FILL}"/>`,
    `<rect x="${left}" width="${right}" height="${HEIGHT}" fill="${VALUE_FILL}"/>`,
    `</g>`,
    `<g fill="#fff" text-anchor="middle" font-family="${FONT}" font-size="11">`,
    text(left / 2, BADGE_LABEL),
    text(left + right / 2, value),
    `</g>`,
    `</svg>`,
    "",
  ].join("\n");
}
