import { Injectable } from "@nestjs/common";
import { loadEsm } from "../common/esm";

type Processor = { process(input: string): Promise<{ toString(): string }> };

@Injectable()
export class MarkdownRenderer {
  private processorPromise: Promise<Processor> | null = null;

  private buildProcessor(): Promise<Processor> {
    this.processorPromise ??= (async () => {
      const [{ unified }, remarkParse, remarkGfm, remarkRehype, rehypeShiki, sanitizeMod, rehypeStringify] =
        await Promise.all([
          loadEsm<typeof import("unified")>("unified"),
          loadEsm<typeof import("remark-parse")>("remark-parse"),
          loadEsm<typeof import("remark-gfm")>("remark-gfm"),
          loadEsm<typeof import("remark-rehype")>("remark-rehype"),
          loadEsm<typeof import("@shikijs/rehype")>("@shikijs/rehype"),
          loadEsm<typeof import("rehype-sanitize")>("rehype-sanitize"),
          loadEsm<typeof import("rehype-stringify")>("rehype-stringify"),
        ]);

      const { defaultSchema } = sanitizeMod;
      const schema: any = {
        ...defaultSchema,
        attributes: {
          ...defaultSchema.attributes,
          span: [...(defaultSchema.attributes?.span ?? []), ["className"], ["style"]],
          pre: [...(defaultSchema.attributes?.pre ?? []), ["className"], ["style"], ["tabindex"]],
          code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
        },
      };

      return unified()
        .use(remarkParse.default)
        .use(remarkGfm.default)
        .use(remarkRehype.default)
        .use(rehypeShiki.default, { theme: "github-dark" })
        .use(sanitizeMod.default, schema)
        .use(rehypeStringify.default) as unknown as Processor;
    })();
    return this.processorPromise;
  }

  async render(markdown: string): Promise<string> {
    const processor = await this.buildProcessor();
    return String(await processor.process(markdown));
  }
}
