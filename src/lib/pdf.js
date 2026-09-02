import jsQR from "jsqr";
import LZString from "lz-string";
import { PDFDocument } from "pdf-lib";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { FORMATS, MESES } from "../constants";
import {
  dateSortKey,
  formatPrintWhen,
  monthParts,
  packCalendar,
  shortFormat,
  unpackCalendar,
  withRowIds,
} from "./calendar";
import { downloadBytes } from "./download";

pdfMake.vfs = pdfFonts.vfs || pdfFonts.pdfMake?.vfs;

export function encodeCalendarQr(data) {
  return "V4Q1:" + LZString.compressToEncodedURIComponent(JSON.stringify(packCalendar(data)));
}

function encodeCalendarJsonB64(data) {
  const packed = JSON.stringify(packCalendar(data));
  return "V4J1:" + btoa(unescape(encodeURIComponent(packed)));
}

function encodeCalendarHidden(data) {
  return encodeCalendarQr(data) + "\n" + encodeCalendarJsonB64(data);
}

function sliceAfterPrefix(text, prefix) {
  const compact = String(text || "").replace(/\s+/g, "");
  const idx = compact.indexOf(prefix);
  if (idx < 0) return "";
  return compact.slice(idx + prefix.length).split(/V4Q1:|V4J1:|V4DATA:/)[0];
}

export function decodeCalendarQr(text) {
  const packed = sliceAfterPrefix(text, "V4Q1:");
  if (!packed) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(packed);
    return json ? unpackCalendar(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

function decodeCalendarJsonB64(text) {
  const packed = sliceAfterPrefix(text, "V4J1:");
  if (!packed) return null;
  try {
    const json = decodeURIComponent(escape(atob(packed.match(/^[A-Za-z0-9+/=]+/)?.[0] || packed)));
    return unpackCalendar(JSON.parse(json));
  } catch {
    return null;
  }
}

export function decodeCalendarPayload(text) {
  const fromQr = decodeCalendarQr(text);
  if (fromQr && Array.isArray(fromQr.rows)) return fromQr;
  const fromB64 = decodeCalendarJsonB64(text);
  if (fromB64 && Array.isArray(fromB64.rows)) return fromB64;
  return null;
}

async function pdfWithEmbeddedData(docDef, data, filename) {
  const pdfGen = pdfMake.createPdf(docDef);
  let raw;
  if (typeof pdfGen.getBlob === "function") {
    const blob = await new Promise((resolve, reject) => {
      try { pdfGen.getBlob(resolve); } catch (err) { reject(err); }
    });
    raw = await blob.arrayBuffer();
  } else {
    raw = await new Promise((resolve, reject) => {
      try { pdfGen.getBuffer(resolve); } catch (err) { reject(err); }
    });
  }
  let bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  try {
    const pdfDoc = await PDFDocument.load(bytes);
    const json = new TextEncoder().encode(JSON.stringify(data));
    await pdfDoc.attach(json, "v4-calendario.json", {
      mimeType: "application/json",
      description: "V4DADOS",
      creationDate: new Date(),
      modificationDate: new Date(),
    });
    bytes = await pdfDoc.save();
  } catch (err) {
    console.warn("Não foi possível anexar os dados ao PDF", err);
  }
  downloadBytes(bytes, filename, "application/pdf");
}

export async function printPdf(data) {
  const { year, month, label } = monthParts(data);
  const brand = data.brand || "V4 Company";
  const channel = data.channel || "A definir";
  const goal = data.monthGoal || "A definir com o cliente";
  const posts = [...data.rows].sort((a, b) => dateSortKey(a).localeCompare(dateSortKey(b)));
  const head = { fillColor: "#1A1A1A", color: "#FFFFFF", bold: true, fontSize: 8 };
  const body = [[
    { text: "Data", ...head },
    { text: "Formato", ...head },
    { text: "Tema", ...head },
    { text: "Ideia central", ...head },
    { text: "Objetivo", ...head },
  ]];
  posts.forEach((p) => {
    const when = formatPrintWhen(p, year, month);
    const sazonal = (p.dateKind || "dia") === "sazonal";
    const fill = sazonal ? "#FDECEC" : null;
    const dateStack = [];
    if (sazonal) {
      dateStack.push({ text: "SAZONAL", color: "#E50914", bold: true, fontSize: 7 });
      if (p.seasonal) dateStack.push({ text: p.seasonal, color: "#E50914", fontSize: 8 });
    }
    dateStack.push({ text: when.week, color: "#E50914", fontSize: 8 });
    dateStack.push({ text: when.day, bold: true, fontSize: 10 });
    body.push([
      { stack: dateStack, fillColor: fill },
      { text: shortFormat(p.format) || "—", bold: true, fillColor: fill },
      { text: p.theme || "—", fillColor: fill },
      { text: p.idea || "—", bold: true, fillColor: fill },
      { text: p.objective || "—", fillColor: fill },
    ]);
  });
  if (!posts.length) {
    body.push([{
      text: "Nenhum conteúdo cadastrado neste mês.",
      colSpan: 5,
      alignment: "center",
      color: "#888888",
    }, {}, {}, {}, {}]);
  }
  const safe = String(brand || "calendario").replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 40);
  const hidden = encodeCalendarHidden(data);
  const content = [
    {
      columns: [
        {
          stack: [
            { text: "V4 COMPANY", color: "#E50914", bold: true, fontSize: 8 },
            { text: "Calendário macro de conteúdo", fontSize: 16, bold: true },
          ],
        },
        {
          stack: [
            { text: label, fontSize: 18, bold: true, alignment: "right" },
            { text: year + " · material para o cliente", fontSize: 9, color: "#888888", alignment: "right" },
          ],
        },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      columns: [
        { stack: [{ text: "CLIENTE", color: "#E50914", fontSize: 7, bold: true }, { text: brand, bold: true }] },
        { stack: [{ text: "CANAL", color: "#E50914", fontSize: 7, bold: true }, { text: channel, bold: true }] },
        { stack: [{ text: "OBJETIVO DO MÊS", color: "#E50914", fontSize: 7, bold: true }, { text: goal, bold: true }] },
      ],
      columnGap: 10,
      margin: [0, 0, 0, 10],
    },
    {
      table: { headerRows: 1, widths: [78, 62, "*", "*", "*"], body },
      layout: {
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        hLineColor: () => "#E5E5E5",
        vLineColor: () => "#E5E5E5",
      },
    },
  ];
  content.push({
    text: hidden,
    fontSize: 3,
    color: "#F7F7F7",
    margin: [0, 10, 0, 0],
  });
  await pdfWithEmbeddedData({
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [16, 16, 16, 20],
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#1A1A1A" },
    content,
  }, data, "Calendario_" + safe + "_" + label + "_" + year + ".pdf");
}

const WEEKDAYS_FOLD = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function foldText(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPdfCell(s) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t || t === "—" || t === "–" || t === "-") return "";
  return t;
}

function compactFold(s) {
  return foldText(s).replace(/ /g, "");
}

function pdfTextItems(content) {
  return (content.items || [])
    .map((it) => {
      const t = it.transform || [1, 0, 0, 1, 0, 0];
      return {
        str: String(it.str || ""),
        x: t[4],
        y: t[5],
        w: it.width || 0,
        font: Math.hypot(t[0], t[1]) || 8,
      };
    })
    .filter((it) => it.str);
}

function clusterByY(items, tol) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const groups = [];
  for (const it of sorted) {
    const g = groups.find((row) => it.y <= row.top + tol && it.y >= row.bottom - tol);
    if (g) {
      g.items.push(it);
      g.top = Math.max(g.top, it.y);
      g.bottom = Math.min(g.bottom, it.y);
    } else {
      groups.push({ top: it.y, bottom: it.y, items: [it] });
    }
  }
  return groups;
}

function clusterByX(items, tol) {
  const groups = [];
  [...items].sort((a, b) => a.x - b.x).forEach((it) => {
    const g = groups.find((col) => Math.abs(col.x - it.x) <= tol);
    if (g) {
      g.items.push(it);
      g.x = g.items.reduce((sum, x) => sum + x.x, 0) / g.items.length;
    } else {
      groups.push({ x: it.x, items: [it] });
    }
  });
  return groups.sort((a, b) => a.x - b.x);
}

function joinPdfItems(items) {
  return [...items]
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map((it) => it.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function rebuildPdfWords(items) {
  const words = [];
  clusterByY(items, 5).forEach((line) => {
    const sorted = [...line.items].sort((a, b) => a.x - b.x);
    let cur = null;
    sorted.forEach((it) => {
      const fs = Math.max(it.font || 8, (cur && cur.font) || 8);
      const pieceW = it.w > 0.1 ? it.w : Math.max(it.str.length, 1) * fs * 0.55;
      if (!cur) {
        cur = { str: it.str, x: it.x, y: it.y, w: pieceW, font: fs };
        return;
      }
      const n = Math.max(compactFold(cur.str).length, 1);
      const estEnd = cur.x + (cur.w > 0.1 ? cur.w : n * fs * 0.62);
      const gap = it.x - estEnd;
      const avgAdv = (it.x - cur.x) / n;
      if (gap < fs * 0.8 || (gap < fs * 1.25 && avgAdv < fs * 1.38)) {
        cur.str += it.str;
        cur.w = it.x + pieceW - cur.x;
        return;
      }
      if (gap < 16) {
        cur.str += (it.str.startsWith(" ") || cur.str.endsWith(" ") ? "" : " ") + it.str;
        cur.w = it.x + pieceW - cur.x;
        return;
      }
      words.push(cur);
      cur = { str: it.str, x: it.x, y: it.y, w: pieceW, font: fs };
    });
    if (cur) words.push(cur);
  });
  return words
    .filter((w) => w.str.trim())
    .map((w) => ({ ...w, str: w.str.replace(/\s+/g, " ").trim() }));
}

function colIndexForX(x, colXs) {
  for (let i = 0; i < colXs.length - 1; i++) {
    if (x < (colXs[i] + colXs[i + 1]) / 2) return i;
  }
  return Math.max(0, colXs.length - 1);
}

function findPdfHeader(items) {
  const lines = clusterByY(items, 10);
  for (const line of lines) {
    const text = joinPdfItems(line.items);
    const compact = compactFold(text);
    if (!compact.includes("data") || !compact.includes("formato") || !compact.includes("tema")) continue;
    const sorted = [...line.items].sort((a, b) => a.x - b.x);
    const chars = [];
    sorted.forEach((w) => {
      const piece = compactFold(w.str);
      if (!piece) return;
      const step = piece.length ? (w.w || piece.length * 4) / piece.length : 0;
      [...piece].forEach((ch, i) => chars.push({ ch, x: w.x + i * step }));
    });
    const acc = chars.map((c) => c.ch).join("");
    const fourCol = !compact.includes("ideia") && compact.includes("objetivo");
    const labels = fourCol
      ? ["data", "formato", "tema", "objetivo"]
      : ["data", "formato", "tema", "ideia", "objetivo"];
    const colXs = labels.map((lab) => {
      const at = acc.indexOf(lab);
      return at >= 0 ? chars[at].x : null;
    });
    const known = colXs.filter((x) => x != null);
    if (known.length < 3) {
      const groups = clusterByX(line.items, 28);
      if (groups.length >= 4) {
        const xs = groups.map((g) => Math.min(...g.items.map((it) => it.x)));
        return { y: line.top, colXs: xs.slice(0, fourCol ? 4 : 5), fourCol: xs.length <= 4 || fourCol };
      }
      continue;
    }
    for (let i = 0; i < colXs.length; i++) {
      if (colXs[i] != null) continue;
      const prev = colXs.slice(0, i).filter((x) => x != null).pop();
      const next = colXs.slice(i + 1).find((x) => x != null);
      colXs[i] = prev != null && next != null ? (prev + next) / 2 : (prev != null ? prev + 90 : next - 90);
    }
    return { y: line.top, colXs, fourCol };
  }
  return null;
}

function expandPdfFormat(s) {
  const f = foldText(s);
  if (!f) return "Reels / Shorts";
  if (f.includes("reels") || f.includes("shorts")) return "Reels / Shorts";
  if (f.includes("estatico")) return "Post estático";
  if (f.includes("texto") || f.includes("thread")) return "Texto / Thread";
  if (f.includes("carrossel")) return "Carrossel";
  if (f.includes("stories") || f.includes("story")) return "Stories";
  if (f.includes("live")) return "Live";
  return FORMATS.find((x) => foldText(x) === f) || s || "Outro";
}

function parsePdfDateCol(text, year) {
  const raw = cleanPdfCell(text);
  const f = foldText(raw);
  const sazonal = /\bsazonal\b/.test(f);
  const weekM = f.match(/\bsemana\s*(\d+)\b/);
  const dmy = raw.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/);
  let date = "";
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    let y = dmy[3] ? Number(dmy[3]) : year;
    if (y < 100) y += 2000;
    if (!y) y = new Date().getFullYear();
    date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (sazonal) {
    const seasonal = raw
      .replace(/sazonal/ig, " ")
      .replace(/\b(domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[áa]bado)\b/ig, " ")
      .replace(/\d{1,2}\s*\/\s*\d{1,2}(?:\s*\/\s*\d{2,4})?/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { dateKind: "sazonal", date, week: "1", seasonal };
  }
  if (weekM) return { dateKind: "semana", date: "", week: String(weekM[1]), seasonal: "" };
  return { dateKind: "dia", date, week: "1", seasonal: "" };
}

function inferPdfColXs(items) {
  const lines = clusterByY(items, 8);
  for (const line of lines) {
    const groups = clusterByX(line.items, 26).filter((g) => joinPdfItems(g.items));
    if (groups.length >= 4) {
      const xs = groups.map((g) => Math.min(...g.items.map((it) => it.x)));
      while (xs.length < 5) xs.push(xs[xs.length - 1] + 80);
      return xs.slice(0, 5);
    }
  }
  const groups = clusterByX(items, 32).filter((g) => g.items.length >= 2);
  if (groups.length >= 4) {
    const xs = groups.sort((a, b) => a.x - b.x).map((g) => Math.min(...g.items.map((it) => it.x)));
    while (xs.length < 5) xs.push(xs[xs.length - 1] + 80);
    return xs.slice(0, 5);
  }
  return null;
}

function metaFromPdfItems(items) {
  const lines = clusterByY(items, 7).map((g) => ({
    text: joinPdfItems(g.items),
    compact: compactFold(joinPdfItems(g.items)),
  }));
  let brand = "";
  let channel = "";
  let monthGoal = "";
  const skipNext = /^(cliente|canal|objetivodomes|objetivodo|data|formato|tema|ideiacentral|objetivo|v4company)$/;
  for (let i = 0; i < lines.length; i++) {
    const c = lines[i].compact;
    const next = lines[i + 1];
    const nextText = next && !skipNext.test(next.compact) ? cleanPdfCell(next.text) : "";
    if (c === "cliente" && nextText) brand = nextText;
    if (c === "canal" && nextText) channel = nextText;
    if ((c === "objetivodomes" || c === "objetivodo") && nextText) monthGoal = nextText;
    if (c === "objetivo" && next && compactFold(next.text).startsWith("domes")) {
      const val = lines[i + 2];
      if (val && !skipNext.test(val.compact)) monthGoal = cleanPdfCell(val.text);
    }
  }
  let monthNum = 0;
  let year = 0;
  items.forEach((it) => {
    const c = compactFold(it.str);
    const mi = MESES.findIndex((m) => compactFold(m) === c);
    if (mi >= 0) monthNum = mi + 1;
    const ym = String(it.str).match(/\b(20\d{2})\b/) || c.match(/(20\d{2})/);
    if (ym) year = Number(ym[1]);
  });
  if (!year) {
    const blob = compactFold(lines.map((l) => l.text).join(" "));
    const ym = blob.match(/(20\d{2})/);
    if (ym) year = Number(ym[1]);
  }
  return {
    brand,
    channel,
    monthGoal,
    month: year && monthNum ? `${year}-${String(monthNum).padStart(2, "0")}` : "",
    year: year || new Date().getFullYear(),
  };
}

function isPdfRecordStart(text) {
  const f = foldText(text);
  const c = compactFold(text);
  if (!c || c === "data") return false;
  if (c.startsWith("sazonal")) return true;
  if (/^semana\d/.test(c)) return true;
  if (WEEKDAYS_FOLD.some((d) => c === d || c.startsWith(d))) return true;
  if (/^\d{1,2}\/\d{1,2}/.test(f)) return true;
  return false;
}

function rowsFromPdfPage(items, fallbackHeader) {
  const pageHeader = findPdfHeader(items);
  const colXs = (pageHeader && pageHeader.colXs) || (fallbackHeader && fallbackHeader.colXs) || inferPdfColXs(items);
  if (!colXs) return [];
  const yCut = pageHeader ? pageHeader.y - 6 : Math.max(...items.map((it) => it.y), 0) + 1;
  const assigned = items
    .filter((it) => it.y < yCut)
    .map((it) => ({ ...it, col: colIndexForX(it.x, colXs) }));
  const col0 = assigned.filter((it) => it.col === 0);
  const sazFlags = col0.filter((it) => compactFold(it.str) === "sazonal");
  const weekStarts = col0.filter((it) => /semana\d/.test(compactFold(it.str)));
  const dayNames = col0.filter((it) => WEEKDAYS_FOLD.includes(compactFold(it.str)));
  const dateOnly = col0.filter((it) => /^\d{1,2}\s*\/\s*\d{1,2}/.test(foldText(it.str)));
  const starts = [...sazFlags, ...weekStarts];
  dayNames.forEach((d) => {
    if (!sazFlags.some((s) => s.y > d.y && s.y - d.y < 62)) starts.push(d);
  });
  dateOnly.forEach((d) => {
    if (!starts.some((s) => s.y >= d.y && s.y - d.y < 62)) starts.push(d);
  });
  starts.sort((a, b) => b.y - a.y || a.x - b.x);
  const uniq = [];
  starts.forEach((s) => {
    if (!uniq.some((u) => Math.abs(u.y - s.y) < 8)) uniq.push(s);
  });
  return uniq.map((start, i) => {
    const next = uniq[i + 1];
    const top = start.y + 16;
    const bottom = next ? next.y + 5 : start.y - 120;
    const band = assigned.filter((it) => it.y <= top && it.y > bottom);
    const cols = ["", "", "", "", ""];
    band.sort((a, b) => b.y - a.y || a.x - b.x).forEach((it) => {
      cols[it.col] = cols[it.col] ? cols[it.col] + " " + it.str : it.str;
    });
    return cols.map(cleanPdfCell);
  }).filter((cols) => {
    const blob = compactFold(cols.join(" "));
    return blob && !blob.includes("nenhumconteudo") && compactFold(cols[0]) !== "data";
  });
}

function rowsFromPdfLines(items) {
  const lines = clusterByY(items, 6).map((g) => ({
    y: g.top,
    text: joinPdfItems(g.items),
    items: g.items,
  }));
  let startAt = lines.findIndex((l) => {
    const c = compactFold(l.text);
    return c.includes("data") && c.includes("formato") && c.includes("tema");
  });
  const body = startAt >= 0 ? lines.slice(startAt + 1) : lines;
  const groups = [];
  body.forEach((line) => {
    if (compactFold(line.text).includes("nenhumconteudo")) return;
    if (isPdfRecordStart(line.text) || !groups.length) {
      if (isPdfRecordStart(line.text)) groups.push([line]);
      else if (groups.length) groups[groups.length - 1].push(line);
    } else {
      groups[groups.length - 1].push(line);
    }
  });
  return groups.map((group) => {
    const header = findPdfHeader(items);
    const colXs = (header && header.colXs) || inferPdfColXs(group.flatMap((g) => g.items));
    const cols = ["", "", "", "", ""];
    group.forEach((line) => {
      line.items.forEach((it) => {
        const col = colXs ? colIndexForX(it.x, colXs) : 0;
        cols[col] = cols[col] ? cols[col] + " " + it.str : it.str;
      });
    });
    if (!colXs) cols[0] = group.map((g) => g.text).join(" ");
    return cols.map(cleanPdfCell);
  }).filter((cols) => cols.some(Boolean) && compactFold(cols[0]) !== "data");
}

function mapPdfColsToRows(colRows, year, fourCol) {
  return colRows.map((cols) => {
    const when = parsePdfDateCol(cols[0], year);
    if (fourCol) {
      return {
        ...when,
        format: expandPdfFormat(cols[1]),
        theme: "",
        idea: cols[2],
        objective: cols[3] || cols[4],
        status: "Brifado",
      };
    }
    return {
      ...when,
      format: expandPdfFormat(cols[1]),
      theme: cols[2],
      idea: cols[3],
      objective: cols[4],
      status: "Brifado",
    };
  }).filter((row) => row.date || row.seasonal || row.theme || row.idea || row.objective || row.dateKind === "semana");
}

function parsePdfCompactBlob(text, year) {
  let compact = compactFold(text);
  const headerAt = compact.indexOf("dataformato");
  if (headerAt >= 0) {
    const objAt = compact.indexOf("objetivo", headerAt);
    compact = compact.slice(objAt >= 0 ? objAt + "objetivo".length : headerAt);
  }
  const chunks = compact
    .split(/(?=(?:sazonal|semana\d+|domingo|segunda|terca|quarta|quinta|sexta|sabado|\d{1,2}\/\d{1,2}))/)
    .filter((c) => c && c.length > 2);
  return chunks.map((chunk) => {
    const labeled = chunk
      .replace(/^sazonal/, "Sazonal ")
      .replace(/^semana(\d+)/, "Semana $1 ")
      .replace(/^(domingo|segunda|terca|quarta|quinta|sexta|sabado)/, "$1 ")
      .replace(/(\d{1,2}\/\d{1,2})/, " $1 ");
    const when = parsePdfDateCol(labeled, year);
    let rest = chunk
      .replace(/^sazonal/, "")
      .replace(/^semana\d+/, "")
      .replace(/^(domingo|segunda|terca|quarta|quinta|sexta|sabado)/, "")
      .replace(/^\d{1,2}\/\d{1,2}/, "");
    const fmtMatch = rest.match(/^(.*?)(reels|shorts|carrossel|estatico|stories|story|live|texto|thread)(.*)$/);
    let format = "Reels / Shorts";
    let idea = rest;
    let seasonal = when.seasonal;
    if (fmtMatch) {
      if (when.dateKind === "sazonal" && fmtMatch[1]) seasonal = seasonal || fmtMatch[1];
      format = expandPdfFormat(fmtMatch[2]);
      idea = fmtMatch[3] || "";
    }
    return {
      ...when,
      seasonal,
      format,
      theme: "",
      idea,
      objective: "",
      status: "Brifado",
    };
  }).filter((row) => row.date || row.seasonal || row.idea || row.dateKind === "semana");
}

function parsePdfCalendar(pages) {
  const meta = metaFromPdfItems(pages[0] || []);
  let header = null;
  const colRows = [];
  pages.forEach((page) => {
    header = findPdfHeader(page) || header;
    colRows.push(...rowsFromPdfPage(page, header));
  });
  const fourCol = Boolean(header && header.fourCol);
  let rows = mapPdfColsToRows(colRows, meta.year, fourCol);
  if (!rows.length) {
    const loose = [];
    pages.forEach((page) => loose.push(...rowsFromPdfLines(page)));
    rows = mapPdfColsToRows(loose, meta.year, fourCol);
  }
  if (!rows.length) {
    rows = parsePdfCompactBlob(pages.flat().map((w) => w.str).join(" "), meta.year);
  }
  return {
    brand: meta.brand,
    month: meta.month,
    channel: meta.channel,
    monthGoal: meta.monthGoal,
    rows,
    foundHeader: Boolean(header || rows.length),
  };
}

function tryLegacyPdfPayload(text) {
  const packed = String(text || "").replace(/\s/g, "");
  const idx = packed.indexOf("V4DATA:");
  if (idx < 0) return null;
  const m = packed.slice(idx + 7).match(/^[A-Za-z0-9+/=]+/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(m[0]))));
  } catch {
    return null;
  }
}

async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist/build/pdf");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.js?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjsLib;
}

async function readPdfAttachment(pdf) {
  if (!pdf.getAttachments) return null;
  let atts = null;
  try { atts = await pdf.getAttachments(); } catch { return null; }
  if (!atts) return null;
  for (const att of Object.values(atts)) {
    try {
      const bytes = att.content || att.data || att;
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const text = new TextDecoder().decode(u8);
      const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
      const data = Array.isArray(parsed.rows) ? parsed : unpackCalendar(parsed);
      if (data && Array.isArray(data.rows) && data.rows.length) return data;
    } catch {}
  }
  return null;
}

async function readQrFromPdf(pdf) {
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    for (const scale of [2, 3]) {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      await page.render({ canvasContext: ctx, viewport }).promise;
      const boxes = [
        [0, 0, canvas.width, canvas.height],
        [Math.floor(canvas.width * 0.55), Math.floor(canvas.height * 0.68), Math.floor(canvas.width * 0.45), Math.floor(canvas.height * 0.32)],
      ];
      for (const [x, y, w, h] of boxes) {
        if (w < 20 || h < 20) continue;
        const img = ctx.getImageData(x, y, w, h);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
        const parsed = code && decodeCalendarPayload(code.data);
        if (parsed && Array.isArray(parsed.rows)) return parsed;
      }
    }
  }
  return null;
}

async function ocrPdfDocument(pdf, onProgress) {
  const Tesseract = await import("tesseract.js");
  onProgress?.("Este PDF veio como imagem. Lendo o texto…");
  const worker = await Tesseract.createWorker("por", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && m.progress != null) {
        onProgress?.("Lendo PDF… " + Math.round(m.progress * 100) + "%");
      }
    },
  });
  const pages = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.("Lendo página " + i + " de " + pdf.numPages + "…");
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 3 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({
        canvasContext: canvas.getContext("2d", { willReadFrequently: true }),
        viewport,
      }).promise;
      const { data } = await worker.recognize(canvas);
      const words = (data.words || [])
        .filter((w) => String(w.text || "").trim() && (w.confidence == null || w.confidence >= 20))
        .map((w) => ({
          str: String(w.text || "").trim(),
          x: w.bbox.x0,
          y: canvas.height - w.bbox.y1,
          w: Math.max(w.bbox.x1 - w.bbox.x0, 1),
          font: Math.max(w.bbox.y1 - w.bbox.y0, 8),
        }));
      pages.push(rebuildPdfWords(words));
    }
  } finally {
    await worker.terminate();
  }
  return pages;
}

export async function importPdf(file, current, onProgress) {
  const pdfjsLib = await getPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const attached = await readPdfAttachment(pdf);
  if (attached) return withRowIds(attached);

  const pages = [];
  let allText = "";
  let textItems = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const raw = pdfTextItems(content);
    textItems += raw.filter((it) => it.str.trim()).length;
    const words = rebuildPdfWords(raw);
    pages.push(words);
    allText += raw.map((it) => it.str).join("") + " " + words.map((it) => it.str).join(" ");
  }

  const fromText = decodeCalendarPayload(allText);
  if (fromText && Array.isArray(fromText.rows) && fromText.rows.length) return withRowIds(fromText);

  const qrData = await readQrFromPdf(pdf);
  if (qrData && Array.isArray(qrData.rows) && qrData.rows.length) return withRowIds(qrData);

  let parsed = parsePdfCalendar(pages);
  if (!parsed.rows.length && textItems < 12) {
    parsed = parsePdfCalendar(await ocrPdfDocument(pdf, onProgress));
  }
  if (parsed.rows.length) {
    return withRowIds({
      brand: parsed.brand || current.brand,
      month: parsed.month || current.month,
      channel: parsed.channel || current.channel,
      monthGoal: parsed.monthGoal || current.monthGoal,
      rows: parsed.rows,
    });
  }
  const legacy = tryLegacyPdfPayload(allText) || decodeCalendarPayload(allText);
  if (legacy) return withRowIds(legacy);
  throw new Error("Este PDF antigo não tem os dados do planner. Baixe de novo em Baixar PDF, ou importe o Excel.");
}
