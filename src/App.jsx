import { useEffect, useMemo, useRef, useState } from "react";
import { PostCard } from "./components/PostCard";
import { PrintPack } from "./components/PrintPack";
import { Toast } from "./components/Toast";
import { PasteIdeas } from "./components/PasteIdeas";
import { IconDownload, IconPaste, IconPlus, IconSave, IconUpload } from "./components/Icons";
import { SEASONAL_DATES } from "./constants";
import { blankCalendar, emptyRow, exportable, monthParts } from "./lib/calendar";
import { isBlankRow } from "./lib/importIdeas";
import { clearCalendarStorage, loadCalendar, saveCalendar } from "./lib/storage";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-v4";
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

export default function App() {
  const [data, setData] = useState(() => loadCalendar());
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    saveCalendar(data);
  }, [data]);

  function showToast(msg, ms) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    if (ms === 0) return;
    const wait = ms != null ? ms : (String(msg || "").length > 42 ? 4200 : 1800);
    toastTimer.current = setTimeout(() => setToast(""), wait);
  }

  function patchMeta(partial) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function updateRow(id, nextRow) {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === id ? nextRow : row)),
    }));
  }

  function applyIdeas(parsed, mode) {
    const incoming = parsed.rows.map((row) => ({ ...row, id: crypto.randomUUID() }));
    setData((prev) => {
      const keep = mode === "replace" ? [] : prev.rows.filter((row) => !isBlankRow(row));
      return {
        ...prev,
        brand: parsed.meta.brand || prev.brand,
        month: parsed.meta.month || prev.month,
        channel: parsed.meta.channel || prev.channel,
        monthGoal: parsed.meta.monthGoal || prev.monthGoal,
        rows: [...keep, ...incoming],
      };
    });
    setPasteOpen(false);
    showToast(`${incoming.length} ${incoming.length === 1 ? "conteúdo preenchido" : "conteúdos preenchidos"} a partir das ideias`);
  }

  function addRow() {
    setData((prev) => ({ ...prev, rows: [...prev.rows, emptyRow()] }));
  }

  function duplicateRow(id) {
    setData((prev) => {
      const idx = prev.rows.findIndex((row) => row.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev.rows[idx], id: crypto.randomUUID() };
      const rows = [...prev.rows];
      rows.splice(idx + 1, 0, copy);
      return { ...prev, rows };
    });
  }

  function deleteRow(id) {
    setData((prev) => {
      const rows = prev.rows.filter((row) => row.id !== id);
      return { ...prev, rows: rows.length ? rows : [emptyRow()] };
    });
  }

  function clearAll() {
    if (!confirm("Limpar todos os dados deste calendário? Essa ação não desfaz.")) return;
    clearCalendarStorage();
    setData(blankCalendar());
    showToast("Dados limpos");
  }

  async function onImport(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      setBusy("import");
      const { importAnyFile } = await import("./lib/io");
      const { data: next, origin } = await importAnyFile(file, data, (msg) => showToast(msg, 0));
      setData(next);
      showToast("Preenchido automaticamente a partir do " + origin);
    } catch (err) {
      const msg = err.message || "Não foi possível abrir o arquivo";
      showToast(msg, 6000);
      alert(msg);
    } finally {
      setBusy("");
    }
  }

  async function onExportExcel() {
    try {
      setBusy("excel");
      const { exportExcel } = await import("./lib/excel");
      await exportExcel(exportable(data));
    } catch (err) {
      const msg = err.message || "Não foi possível exportar o Excel";
      showToast(msg, 6000);
    } finally {
      setBusy("");
    }
  }

  async function onPrintPdf() {
    try {
      setBusy("pdf");
      const { printPdf } = await import("./lib/pdf");
      await printPdf(exportable(data));
      showToast("PDF baixado com os dados do calendário. Importe ESTE arquivo para reabrir.");
    } catch (err) {
      const msg = err.message || "Não foi possível gerar o PDF";
      showToast(msg, 6000);
      alert(msg);
    } finally {
      setBusy("");
    }
  }

  const { label, year } = monthParts(data);
  const counts = useMemo(() => {
    const rows = data.rows || [];
    return {
      total: rows.length,
      posted: rows.filter((r) => r.status === "Postado").length,
      seasonal: rows.filter((r) => r.dateKind === "sazonal").length,
    };
  }, [data.rows]);

  return (
    <>
      <div className="app-shell min-h-screen bg-black pb-24 text-white">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-xl bg-v4" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-v4">V4 Company · Planner</p>
                <h1 className="font-display text-3xl leading-none tracking-wide">Calendário macro</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPasteOpen(true)} className="btn-primary">
                <IconPaste /> Colar ideias
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => fileRef.current?.click()} className="btn-ghost">
                <IconUpload /> {busy === "import" ? "Importando…" : "Importar"}
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={onExportExcel} className="btn-ghost">
                <IconDownload /> {busy === "excel" ? "Exportando…" : "Excel"}
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={onPrintPdf} className="btn-ghost">
                <IconDownload /> {busy === "pdf" ? "Gerando…" : "PDF"}
              </button>
              <button type="button" onClick={() => showToast("Salvo")} className="btn-primary">
                <IconSave /> Salvar
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
          <section className="rounded-2xl border border-white/10 bg-panel p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-v4">Campanha do mês</p>
                <p className="mt-1 text-lg font-semibold">{label} {year}</p>
              </div>
              <button type="button" onClick={clearAll} className="text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-v4">
                Limpar todos os dados
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>Marca / perfil</label>
                <input className={inputClass} placeholder="Nome da marca" value={data.brand} onChange={(e) => patchMeta({ brand: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Mês</label>
                <input className={inputClass} type="month" value={data.month} onChange={(e) => patchMeta({ month: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Canal principal</label>
                <input className={inputClass} placeholder="Instagram, TikTok, LinkedIn…" value={data.channel} onChange={(e) => patchMeta({ channel: e.target.value })} />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Objetivo do mês</label>
              <input
                className={`${inputClass} text-base font-semibold`}
                placeholder="Ex.: gerar autoridade e leads qualificados para a oferta de setembro"
                value={data.monthGoal}
                onChange={(e) => patchMeta({ monthGoal: e.target.value })}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl tracking-wide">Conteúdos</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {counts.total} {counts.total === 1 ? "peça" : "peças"}
                  {counts.posted ? ` · ${counts.posted} postada${counts.posted > 1 ? "s" : ""}` : ""}
                  {counts.seasonal ? ` · ${counts.seasonal} sazonal${counts.seasonal > 1 ? "is" : ""}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setPasteOpen(true)} className="btn-ghost">
                <IconPaste /> Colar ideias
              </button>
              <button type="button" onClick={addRow} className="btn-primary">
                <IconPlus /> Adicionar conteúdo
              </button>
            </div>

            {data.rows.map((row, i) => (
              <PostCard
                key={row.id}
                row={row}
                index={i}
                month={data.month}
                onChange={(next) => updateRow(row.id, next)}
                onDuplicate={() => duplicateRow(row.id)}
                onDelete={() => deleteRow(row.id)}
              />
            ))}

            <button
              type="button"
              onClick={addRow}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 py-4 text-sm font-semibold uppercase tracking-wide text-zinc-400 hover:border-v4 hover:text-v4"
            >
              <IconPlus /> Nova linha
            </button>
          </section>

          <p className="text-sm text-zinc-500">
            Tudo é editável. Cole ideias do ChatGPT ou Claude. O PDF e o Excel levam os dados junto para reimportar.
          </p>
        </main>
      </div>

      <PasteIdeas open={pasteOpen} data={data} onClose={() => setPasteOpen(false)} onApply={applyIdeas} />
      <PrintPack data={data} />
      <Toast message={toast} />
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.pdf,.json,application/pdf,application/json"
        hidden
        onChange={onImport}
      />
      <datalist id="seasonalDates">
        {SEASONAL_DATES.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
    </>
  );
}
