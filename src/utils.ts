import { statSync } from "fs";
export function isFile(path: string): boolean {
  try {
    const stat = statSync(path);
    if (stat.isFile()) return true;
  } catch {}
  return false;
}

export function isRelativeStart(path: string): boolean {
  return path.startsWith("./") || path.startsWith("../");
}
