import { useEffect } from "react";

export function useDocumentMeta(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
