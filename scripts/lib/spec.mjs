// Naming rules from docs/SPEC.md — one place, used by the build and the checks.

export const BASE = "https://cdn.cmss.io";
export const TYPES = ["fonts", "js", "css", "images"];

export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const VERSION_RE = /^\d+\.\d+\.\d+(-[0-9a-z]+(\.[0-9a-z]+)*)?$/;
/** A file name: lowercase words joined by "-", dots only before the extension(s). */
export const FILE_RE = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;

export const isName = (s) => NAME_RE.test(s);
export const isVersion = (s) => VERSION_RE.test(s);
export const isFileName = (s) => FILE_RE.test(s);

/** `https://cdn.cmss.io/<type>/<name>/<version>/<file>` */
export function urlOf(type, name, version, file = "") {
  const parts = [BASE, type, name, version];
  if (file) parts.push(file);
  return parts.join("/");
}
