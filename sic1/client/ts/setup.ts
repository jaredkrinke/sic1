// Check for debug mode
const url = new URL(window.location.href);
const debugSearchParameter = url.searchParams.get("debug");
export const debug = (debugSearchParameter === undefined) ? (url.hostname === "localhost") : (debugSearchParameter !== "0");
