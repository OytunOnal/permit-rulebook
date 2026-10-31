/** The rendered text, with the markup taken away — what a reader actually reads. */
export const textOf = (html: string): string =>
  html.replace(/<style>[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8599;/g, " ")
    .replace(/\s+/g, " ");
