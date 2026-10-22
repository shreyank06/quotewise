import { parseCsv } from "./csv";

export type ImportedCustomer = {
  name: string;
  company: string | null;
  emails: string[];
  billingEmail: string | null;
  phones: string[];
  address: string | null;
  notes: string[];
  /** Original CSV row numbers merged into this record, for traceability. */
  sourceRows: number[];
};

type Row = { index: number; name: string; company: string; email: string; phone: string; address: string; notes: string };

const normPhone = (p: string) => p.replace(/\D/g, "");
const normCompany = (c: string) =>
  c.toLowerCase().replace(/\b(ltd|limited|lettings|plc|co|& co)\b/g, "").replace(/[^a-z0-9]/g, "");
const surname = (n: string) => n.trim().split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
const normAddressKey = (a: string) =>
  a
    .toLowerCase()
    .replace(/\bave\b/g, "avenue")
    .replace(/\brd\b/g, "road")
    .replace(/\bst\b/g, "street")
    .split(",")[0]
    .replace(/[^a-z0-9]/g, "");

/** Two rows are the same customer if any strong identifier matches. */
function sameCustomer(a: Row, b: Row): boolean {
  if (a.email && a.email === b.email) return true;
  if (a.phone && a.phone === b.phone) return true;
  if (a.company && b.company && normCompany(a.company) === normCompany(b.company)) return true;
  if (a.address && b.address && surname(a.name) === surname(b.name) && normAddressKey(a.address) === normAddressKey(b.address))
    return true;
  return false;
}

const longest = (values: string[]) => values.filter(Boolean).sort((x, y) => y.length - x.length)[0] ?? null;
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

export function importCustomers(csvText: string): ImportedCustomer[] {
  const rows: Row[] = parseCsv(csvText).map((r, i) => ({
    index: i + 2, // +1 header, +1 for 1-based rows as Shaz sees them in Excel
    name: r.name ?? "",
    company: r.company ?? "",
    email: (r.email ?? "").toLowerCase(),
    phone: normPhone(r.phone ?? ""),
    address: r.address ?? "",
    notes: r.notes ?? "",
  }));

  // Union-find so that A~B and B~C end up in one group.
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  rows.forEach((a, i) => rows.forEach((b, j) => j > i && sameCustomer(a, b) && (parent[find(j)] = find(i))));

  const groups = new Map<number, Row[]>();
  rows.forEach((r, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), r]));

  return [...groups.values()].map((group) => {
    const billingRow = group.find((r) => /invoice/i.test(r.notes) && r.email);
    const notes = unique(group.map((r) => r.notes)).filter((n) => !/^duplicate\??$/i.test(n));
    if (group.length > 1) notes.push(`Merged from ${group.length} rows in the original list`);
    return {
      // Prefer a full name ("Patience Okafor") over initials ("Mrs P Okafor").
      name: longest(group.filter((r) => !/^(mr|mrs|ms|miss|dr)\b|^\w\.\s/i.test(r.name)).map((r) => r.name)) ?? longest(group.map((r) => r.name)) ?? "",
      company: longest(group.map((r) => r.company)),
      emails: unique(group.map((r) => r.email)),
      billingEmail: billingRow?.email ?? null,
      phones: unique(group.map((r) => r.phone)),
      address: longest(group.map((r) => r.address)),
      notes,
      sourceRows: group.map((r) => r.index),
    };
  });
}
