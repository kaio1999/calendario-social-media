import { FORMAT_SHORT, MESES } from "../constants";

export function emptyRow() {
  return {
    id: crypto.randomUUID(),
    dateKind: "dia",
    date: "",
    week: "1",
    seasonal: "",
    objective: "",
    theme: "",
    format: "Reels / Shorts",
    idea: "",
    status: "Brifado",
  };
}

export function blankCalendar() {
  return {
    brand: "",
    month: new Date().toISOString().slice(0, 7),
    channel: "",
    monthGoal: "",
    rows: [emptyRow()],
  };
}

export function withRowIds(data) {
  return {
    ...data,
    rows: (data.rows?.length ? data.rows : [emptyRow()]).map((row) => ({
      ...emptyRow(),
      ...row,
      id: row.id || crypto.randomUUID(),
    })),
  };
}

export function exportable(data) {
  return {
    brand: data.brand || "",
    month: data.month || "",
    channel: data.channel || "",
    monthGoal: data.monthGoal || "",
    rows: (data.rows || []).map(({ id, ...row }) => row),
  };
}

export function monthParts(data) {
  const raw = data.month || new Date().toISOString().slice(0, 7);
  const [y, m] = raw.split("-").map(Number);
  return { year: y, month: m, label: MESES[m - 1] || "MES" };
}

export function weeksOfMonth(year, month) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const lastDay = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= lastDay; d++) days.push(d);
  while (days.length % 7) days.push(null);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function weekRanges(year, month) {
  return weeksOfMonth(year, month).map((days, i) => {
    const nums = days.filter(Boolean);
    return { n: i + 1, from: nums[0], to: nums[nums.length - 1] };
  });
}

export function weekOptions(monthValue, selected) {
  const { year, month } = monthParts({ month: monthValue });
  return weekRanges(year, month).map((r) => ({
    value: String(r.n),
    label: `Semana ${r.n} · ${r.from} a ${r.to}`,
    selected: String(selected || "1") === String(r.n),
  }));
}

export function shortFormat(f) {
  return FORMAT_SHORT[f] || f;
}

export function sheetName(s) {
  const clean = String(s || "Calendario").replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31);
  return clean || "Calendario";
}

export function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function xmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function postsByDay(data, year, month) {
  const map = {};
  const weeks = weeksOfMonth(year, month);
  for (const row of data.rows) {
    const kind = row.dateKind || "dia";
    if (kind === "semana") {
      const week = weeks[Number(row.week) - 1];
      const first = week && week.find(Boolean);
      if (first) (map[first] ||= []).push(row);
      continue;
    }
    if ((kind === "dia" || kind === "sazonal") && row.date) {
      const d = new Date(row.date + "T00:00:00");
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
      (map[d.getDate()] ||= []).push(row);
    }
  }
  return map;
}

export function cellText(posts) {
  if (!posts || !posts.length) return "";
  return posts.map((p) => {
    const title = `${shortFormat(p.format)}: ${p.idea || ""}`.trim();
    const lines = [title];
    if (p.dateKind === "semana") lines.unshift(`Semana ${p.week}`);
    if (p.dateKind === "sazonal" && p.seasonal) lines.unshift(p.seasonal);
    if (p.theme) lines.push(p.theme);
    if (p.objective) lines.push(`Objetivo: ${p.objective}`);
    return lines.filter(Boolean).join("\n");
  }).join("\n\n");
}

export function cellRichText(posts) {
  if (!posts || !posts.length) return "";
  const rich = [];
  posts.forEach((p, idx) => {
    if (idx) rich.push({ font: { name: "Calibri", size: 10 }, text: "\n\n" });
    const title = `${shortFormat(p.format)}: ${p.idea || ""}`.trim();
    if (p.dateKind === "semana") rich.push({ font: { name: "Calibri", size: 10, italic: true }, text: `Semana ${p.week}\n` });
    if (p.dateKind === "sazonal" && p.seasonal) rich.push({ font: { name: "Calibri", size: 10, italic: true }, text: `${p.seasonal}\n` });
    rich.push({ font: { name: "Calibri", size: 10, bold: true }, text: title });
    if (p.theme) rich.push({ font: { name: "Calibri", size: 10 }, text: "\n" + p.theme });
    if (p.objective) rich.push({ font: { name: "Calibri", size: 10 }, text: "\nObjetivo: " + p.objective });
  });
  return { richText: rich };
}

export function dayStatus(posts) {
  if (!posts || !posts.length) return "vazio";
  if (posts.some((p) => (p.dateKind || "dia") === "sazonal")) return "Sazonal";
  const order = ["Cancelado", "Postado", "Programado", "Brifado"];
  return order.find((s) => posts.some((p) => p.status === s)) || "Brifado";
}

export function formatPrintDate(iso) {
  if (!iso) return { week: "Sem data", day: "—" };
  const d = new Date(iso + "T00:00:00");
  const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const day = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { week: weekdays[d.getDay()], day };
}

export function formatPrintWhen(row, year, month) {
  const kind = row.dateKind || "dia";
  if (kind === "semana") {
    const ranges = weekRanges(year, month);
    const r = ranges.find((x) => String(x.n) === String(row.week));
    return {
      week: r ? `Semana ${r.n}` : `Semana ${row.week || "—"}`,
      day: r ? `${r.from} a ${r.to}` : "—",
    };
  }
  return formatPrintDate(row.date);
}

export function dateSortKey(row) {
  const kind = row.dateKind || "dia";
  if (kind === "dia" || (kind === "sazonal" && row.date)) return "1-" + (row.date || "9999-99-99");
  if (kind === "semana") return "2-" + String(row.week || 9).padStart(2, "0");
  return "3-" + (row.seasonal || "zzz").toLowerCase();
}

export function packCalendar(data) {
  return {
    v: 1,
    b: data.brand || "",
    m: data.month || "",
    c: data.channel || "",
    g: data.monthGoal || "",
    r: (data.rows || []).map((row) => [
      row.dateKind || "dia",
      row.date || "",
      row.week || "",
      row.seasonal || "",
      row.format || "",
      row.theme || "",
      row.idea || "",
      row.objective || "",
      row.status || "Brifado",
    ]),
  };
}

export function unpackCalendar(p) {
  if (!p) return null;
  if (Array.isArray(p.rows)) return p;
  return {
    brand: p.b || "",
    month: p.m || "",
    channel: p.c || "",
    monthGoal: p.g || "",
    rows: (p.r || []).map((a) => ({
      dateKind: a[0] || "dia",
      date: a[1] || "",
      week: a[2] || "",
      seasonal: a[3] || "",
      format: a[4] || "Reels / Shorts",
      theme: a[5] || "",
      idea: a[6] || "",
      objective: a[7] || "",
      status: a[8] || "Brifado",
    })),
  };
}

export function asMonth(v) {
  const s = String(v || "");
  return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : s;
}

export function cellStr(cell) {
  const v = cell && cell.value;
  if (v == null || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if (v.text) return String(v.text);
    if (v.result != null) return cellStr({ value: v.result });
    if (Array.isArray(v.richText)) return v.richText.map((x) => x.text || "").join("");
  }
  return String(v);
}
