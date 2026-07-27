import path from "node:path";

export function resolveWebDistIndex(): string {
  return process.env.WEB_DIST ?? path.resolve(process.cwd(), "../../apps/web/dist/index.html");
}
