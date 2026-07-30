import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { resolveWebDistIndex } from "./web-dist";

const HEAD_MARKER = "<!--head-->";
const APP_MARKER = "<!--app-->";
const STYLESHEET_TAG = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;

function inlineStylesheets(html: string, distDir: string): string {
  return html.replace(STYLESHEET_TAG, (tag, href: string) => {
    const cssPath = path.join(distDir, href.replace(/^\//, ""));
    return existsSync(cssPath) ? `<style>${readFileSync(cssPath, "utf8")}</style>` : tag;
  });
}

@Injectable()
export class PagesService {
  private readonly html: string | null;

  constructor() {
    const indexPath = resolveWebDistIndex();
    this.html = existsSync(indexPath)
      ? inlineStylesheets(readFileSync(indexPath, "utf8"), path.dirname(indexPath))
      : null;
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
