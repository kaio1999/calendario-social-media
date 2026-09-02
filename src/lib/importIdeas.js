import { FORMATS, MESES, SEASONAL_DATES, STATUSES } from "../constants";
import { emptyRow } from "./calendar";

function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function compact(s) {
  return fold(s).replace(/ /g, "");
}

const FIELD_ALIASES = [
  { key: "seasonal", names: ["data sazonal", "campanha sazonal", "sazonal", "seasonal"] },
  { key: "idea", names: ["ideia central", "ideia", "idea", "mensagem", "copy", "hook", "legenda"] },
  { key: "objective", names: ["objetivo do conteudo", "objetivo", "objective", "cta", "para que", "intencao"] },
  { key: "format", names: ["formato", "format", "tipo de conteudo", "tipo"] },
  { key: "theme", names: ["tema", "theme", "pilar", "assunto"] },
  { key: "status", names: ["status", "situacao"] },
  { key: "week", names: ["semana", "week"] },
  { key: "dateKind", names: ["tipo de data", "datekind"] },
  { key: "date", names: ["data da postagem", "data", "dia", "date", "quando"] },
];

const META_ALIASES = [
  { key: "brand", names: ["marca", "brand", "cliente", "perfil"] },
  { key: "month", names: ["mes", "month", "competencia"] },
  { key: "channel", names: ["canal principal", "canal", "channel"] },
  { key: "monthGoal", names: ["objetivo do mes", "objetivo mensal", "meta do mes"] },
];

export function expandFormat(s) {
  const f = fold(s);
  if (!f) return "Reels / Shorts";
  if (f.includes("reels") || f.includes("shorts") || f === "reel") return "Reels / Shorts";
  if (f.includes("estatico") || f === "feed" || f.includes("post unico")) return "Post estático";
  if (f.includes("texto") || f.includes("thread") || f.includes("carrossel de texto")) return f.includes("carrossel") ? "Carrossel" : "Texto / Thread";
  if (f.includes("carrossel")) return "Carrossel";
  if (f.includes("stories") || f.includes("story")) return "Stories";
  if (f.includes("live")) return "Live";
  return FORMATS.find((x) => fold(x) === f) || "Outro";
}

function expandStatus(s) {
  const f = fold(s);
  return STATUSES.find((x) => fold(x) === f) || "Brifado";
}

function parseIsoDate(raw, yearHint) {
  const t = String(raw || "").trim();
  if (!t) return "";
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const dmy = t.match(/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*(\d{2,4}))?/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    let y = dmy[3] ? Number(dmy[3]) : yearHint;
    if (y < 100) y += 2000;
    if (!y) y = new Date().getFullYear();
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const named = t.match(/(\d{1,2})\s+de\s+([a-zçáéíóú]+)/i);
  if (named) {
    const mi = MESES.findIndex((m) => compact(m) === compact(named[2]) || compact(m).startsWith(compact(named[2]).slice(0, 3)));
    if (mi >= 0) {
      const y = yearHint || new Date().getFullYear();
      return `${y}-${String(mi + 1).padStart(2, "0")}-${String(Number(named[1])).padStart(2, "0")}`;
    }
  }
  return "";
}

function parseMonth(raw) {
  const t = String(raw || "").trim();
  const iso = t.match(/(20\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const dmy = t.match(/(\d{1,2})[\/.\-](\d{4})/);
  if (dmy) return `${dmy[2]}-${dmy[1].padStart(2, "0")}`;
  const named = fold(t);
  const mi = MESES.findIndex((m) => compact(m) === compact(named.split(" ")[0]) || named.includes(fold(m)));
  const year = t.match(/(20\d{2})/);
  if (mi >= 0) return `${year ? year[1] : new Date().getFullYear()}-${String(mi + 1).padStart(2, "0")}`;
  return t.match(/^\d{4}-\d{2}$/) ? t : "";
}

function stripFences(text) {
  const m = String(text || "").match(/```(?:json|markdown|md)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : String(text || "").trim();
}

function tryJson(text) {
  const raw = stripFences(text);
  try {
    return JSON.parse(raw);
  } catch {}
  const start = raw.search(/[\[{]/);
  if (start < 0) return null;
  try {
    return JSON.parse(raw.slice(start));
  } catch {
    return null;
  }
}

function matchAlias(line, aliases) {
  const f = fold(line);
  for (const { key, names } of aliases) {
    for (const name of names) {
      if (f === name || f.startsWith(name + ":") || f.startsWith(name + "-") || f.startsWith(name + " –") || f.startsWith(name + " —")) {
        const cut = line.replace(new RegExp(`^[^:]{0,40}:\\s*`, "u"), "").trim();
        const value = fold(line).startsWith(name) && line.includes(":") ? cut : "";
        return { key, value, name };
      }
    }
  }
  return null;
}

function parseLabeledChunk(chunk) {
  const lines = String(chunk || "").split(/\n/);
  const fields = {};
  let current = null;
  lines.forEach((line) => {
    const trimmed = line.replace(/^[-*•]\s+/, "").trim();
    if (!trimmed || /^[-—=]{3,}$/.test(trimmed)) return;
    const meta = matchAlias(trimmed, META_ALIASES);
    const field = matchAlias(trimmed, FIELD_ALIASES);
    const hit = field || meta;
    if (hit) {
      current = hit.key;
      fields[current] = hit.value || "";
      return;
    }
    if (current) fields[current] = fields[current] ? `${fields[current]} ${trimmed}` : trimmed;
  });
  return fields;
}

function detectSeasonal(text) {
  const f = fold(text);
  return SEASONAL_DATES.find((d) => f.includes(fold(d))) || "";
}

function fieldsToRow(fields, context) {
  const year = Number((context.month || "").slice(0, 4)) || new Date().getFullYear();
  const row = emptyRow();
  const date = parseIsoDate(fields.date, year);
  const weekM = String(fields.week || "").match(/(\d+)/);
  const seasonal = fields.seasonal || detectSeasonal(`${fields.theme || ""} ${fields.idea || ""} ${fields.date || ""}`);
  const kindHint = fold(fields.dateKind);

  row.theme = String(fields.theme || "").trim();
  row.idea = String(fields.idea || "").trim();
  row.objective = String(fields.objective || "").trim();
  row.format = expandFormat(fields.format);
  row.status = expandStatus(fields.status);
  row.date = date;
  row.week = weekM ? String(weekM[1]) : "1";
  row.seasonal = String(seasonal || "").trim();

  if (kindHint.includes("sazonal") || row.seasonal) row.dateKind = "sazonal";
  else if (kindHint.includes("semana") || (weekM && !date)) row.dateKind = "semana";
  else row.dateKind = "dia";

  if (!row.idea && !row.theme && fields.untitled) {
    row.idea = String(fields.untitled).trim();
  }
  return row;
}

function isUseful(row) {
  return Boolean(row.theme || row.idea || row.objective || row.date || row.seasonal);
}

function parseMarkdownTable(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.includes("|"));
  if (tableLines.length < 2) return [];
  const split = (line) => line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const header = split(tableLines[0]).map(fold);
  const body = tableLines.slice(1).filter((l) => !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(l));
  const indexOf = (names) => header.findIndex((h) => names.some((n) => h === n || h.includes(n)));
  const map = {
    date: indexOf(["data", "dia", "date"]),
    format: indexOf(["formato", "format", "tipo"]),
    theme: indexOf(["tema", "pilar", "assunto"]),
    idea: indexOf(["ideia", "idea", "mensagem", "copy"]),
    objective: indexOf(["objetivo", "cta"]),
    status: indexOf(["status"]),
    week: indexOf(["semana", "week"]),
    seasonal: indexOf(["sazonal"]),
  };
  return body.map((line) => {
    const cols = split(line);
    const fields = {};
    Object.entries(map).forEach(([key, idx]) => {
      if (idx >= 0) fields[key] = cols[idx] || "";
    });
    return fields;
  }).filter((f) => Object.values(f).some(Boolean));
}

function splitBlocks(text) {
  const cleaned = text
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\r/g, "");
  const byRule = cleaned.split(/\n\s*(?:---|—{3,}|===+)\s*\n/);
  if (byRule.length > 1) return byRule;
  const byHeading = cleaned.split(/\n(?=(?:conte[uú]do|post|pe[cç]a|ideia|item)\s*\d+\b)/i);
  if (byHeading.length > 1) return byHeading;
  const byNumber = cleaned.split(/\n(?=\d{1,2}[\.\)]\s+)/);
  if (byNumber.length > 2) return byNumber;
  const chunks = [];
  let buf = [];
  cleaned.split(/\n/).forEach((line) => {
    const start = matchAlias(line.replace(/^[-*•]\s+/, ""), FIELD_ALIASES);
    if (start && (start.key === "date" || start.key === "format" || start.key === "theme" || start.key === "idea") && buf.length) {
      const prev = buf.join("\n");
      if (matchAlias(buf[0].replace(/^[-*•]\s+/, ""), FIELD_ALIASES) || parseLabeledChunk(prev).theme || parseLabeledChunk(prev).idea) {
        chunks.push(prev);
        buf = [line];
        return;
      }
    }
    buf.push(line);
  });
  if (buf.length) chunks.push(buf.join("\n"));
  return chunks.length > 1 ? chunks : [cleaned];
}

function extractMeta(fieldsOrText) {
  const fields = typeof fieldsOrText === "string" ? parseLabeledChunk(fieldsOrText) : fieldsOrText;
  const meta = {};
  if (fields.brand) meta.brand = String(fields.brand).trim();
  if (fields.channel) meta.channel = String(fields.channel).trim();
  if (fields.monthGoal) meta.monthGoal = String(fields.monthGoal).trim();
  const month = parseMonth(fields.month || "");
  if (month) meta.month = month;
  return meta;
}

function normalizeParsed(json, context) {
  if (Array.isArray(json)) {
    return {
      meta: {},
      rows: json.map((row) => fieldsToRow({ ...row, idea: row.idea || row.ideia, theme: row.theme || row.tema, objective: row.objective || row.objetivo, format: row.format || row.formato }, context)).filter(isUseful),
    };
  }
  const rows = Array.isArray(json.rows) ? json.rows : [];
  return {
    meta: {
      brand: json.brand || json.marca || "",
      month: parseMonth(json.month || json.mes || "") || json.month || "",
      channel: json.channel || json.canal || "",
      monthGoal: json.monthGoal || json.objetivoDoMes || json.objetivo_do_mes || "",
    },
    rows: rows.map((row) => fieldsToRow({ ...row, idea: row.idea || row.ideia, theme: row.theme || row.tema, objective: row.objective || row.objetivo, format: row.format || row.formato }, context)).filter(isUseful),
  };
}

export function parsePastedIdeas(text, context = {}) {
  const raw = String(text || "").trim();
  if (!raw) return { meta: {}, rows: [], error: "Cole o texto das ideias para começar." };

  const json = tryJson(raw);
  if (json) {
    const parsed = normalizeParsed(json, context);
    if (parsed.rows.length) return parsed;
  }

  const body = stripFences(raw);
  const tableFields = parseMarkdownTable(body);
  if (tableFields.length) {
    return {
      meta: extractMeta(body),
      rows: tableFields.map((f) => fieldsToRow(f, context)).filter(isUseful),
    };
  }

  const meta = extractMeta(body);
  const blocks = splitBlocks(body);
  const rows = blocks.map((block) => {
    const fields = parseLabeledChunk(block);
    const hasContent = fields.idea || fields.theme || fields.objective || fields.date || fields.seasonal || fields.week || fields.format;
    if (!hasContent) {
      if (fields.brand || fields.month || fields.channel || fields.monthGoal) return null;
      const loose = block.replace(/^(?:conte[uú]do|post|pe[cç]a|ideia|item)?\s*\d+[\.\):\-–]?\s*/i, "").trim();
      if (loose) fields.untitled = loose.split("\n")[0];
    }
    return fieldsToRow(fields, context);
  }).filter((row) => row && isUseful(row));

  if (!rows.length) {
    return {
      meta,
      rows: [],
      error: "Não encontrei conteúdos. Copie o prompt, peça no ChatGPT/Claude e cole a resposta aqui.",
    };
  }
  return { meta, rows };
}

export function isBlankRow(row) {
  return !row?.date && !row?.theme && !row?.idea && !row?.objective && !row?.seasonal;
}

export function buildIdeaPrompt(data) {
  const month = data.month || new Date().toISOString().slice(0, 7);
  const brand = data.brand || "(preencher)";
  const channel = data.channel || "(preencher)";
  const goal = data.monthGoal || "(preencher com o objetivo do mês)";
  return `Você é estrategista de social media da V4 Company. Transforme minhas ideias em um calendário macro de conteúdo, já no formato que o planner entende.

Contexto:
- Marca / perfil: ${brand}
- Mês: ${month}
- Canal principal: ${channel}
- Objetivo do mês: ${goal}

Regras:
- Crie um conteúdo por bloco, separados por ---
- Preencha TODOS os campos de cada conteúdo
- Formato deve ser exatamente um destes: Reels / Shorts, Carrossel, Post estático, Stories, Live, Texto / Thread
- Status inicial: Brifado
- Data no formato DD/MM/AAAA
- Se for sazonal (Natal, Black Friday etc.), use o campo Sazonal e também a data da postagem
- Se for da semana inteira, use Semana: 1 (ou 2, 3...) em vez de Data
- Não explique nada. Responda só no formato abaixo.

Marca: ${brand}
Mês: ${month}
Canal: ${channel}
Objetivo do mês: ${goal}

---
Data: 
Formato: 
Tema: 
Ideia central: 
Objetivo: 
Status: Brifado
---

Minhas ideias:
`;
}
