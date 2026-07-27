import { existsSync, readFileSync } from "node:fs";
import { Injectable } from "@nestjs/common";
import { resolveWebDistIndex } from "./web-dist";

const HEAD_MARKER = "<!--head-->";
const APP_MARKER = "<!--app-->";

@Injectable()
export class PagesService {
  private readonly html: string | null;

  constructor() {
    const indexPath = resolveWebDistIndex();
    this.html = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : null;
  }

  get available(): boolean {
    return this.html !== null;
  }

  render(headHtml: string, appHtml = ""): string {
    if (this.html === null) throw new Error("web dist not built");
    const nl = headHtml.indexOf("\n");
    const titleTag = nl === -1 ? headHtml : headHtml.slice(0, nl);
    const restHead = nl === -1 ? "" : headHtml.slice(nl + 1);
    return this.html
      .replace(/<title>[^<]*<\/title>/, titleTag)
      .replace(HEAD_MARKER, restHead)
      .replace(APP_MARKER, appHtml);
  }
}
