export type EnquiryHeaders = {
  fromName: string | null;
  fromEmail: string | null;
  subject: string | null;
};

/** Pulls sender details from a pasted email so customer matching doesn't depend on the model. */
export function parseEnquiryHeaders(text: string): EnquiryHeaders {
  const from = text.match(/^From:\s*(?:"?([^"<\n]*?)"?\s*)?<?([\w.+-]+@[\w.-]+\.\w+)>?/im);
  const subject = text.match(/^Subject:\s*(.+)$/im);
  return {
    fromName: from?.[1]?.trim() || null,
    fromEmail: from?.[2]?.toLowerCase() ?? null,
    subject: subject?.[1]?.trim() ?? null,
  };
}
