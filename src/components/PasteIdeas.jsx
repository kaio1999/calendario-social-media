import { useEffect, useMemo, useState } from "react";
import { shortFormat } from "../lib/calendar";
import { buildIdeaPrompt, parsePastedIdeas } from "../lib/importIdeas";

export function PasteIdeas({ open, data, onClose, onApply }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("append");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setText("");
      setCopied(false);
      setMode("append");
    }
  }, [open]);

  const parsed = useMemo(() => parsePastedIdeas(text, { month: data.month }), [text, data.month]);
  const prompt = useMemo(() => buildIdeaPrompt(data), [data]);

  if (!open) return null;

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 md:items-center md:p-6" onClick={onClose}>
      <div
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-panel shadow-2xl md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 px-5 py-4 md:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-v4">Do ChatGPT ou Claude</p>
          <h2 className="mt-1 font-display text-3xl tracking-wide">Colar ideias</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Copia o prompt, cola no chat com as ideias dela, e traz a resposta para cá. O planner monta os cards sozinho.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 md:px-6">
          <button type="button" onClick={copyPrompt} className="btn-ghost w-full justify-center">
            {copied ? "Prompt copiado" : "Copiar prompt para o ChatGPT / Claude"}
          </button>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Resposta da IA</span>
            <textarea
              autoFocus
              className="min-h-[220px] w-full resize-y rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-v4"
              placeholder={"Cole aqui. Pode ser:\n\n---\nData: 12/09/2026\nFormato: Reels / Shorts\nTema: autoridade\nIdeia central: ...\nObjetivo: ..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          {parsed.error && text.trim() ? (
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">{parsed.error}</p>
          ) : null}

          {parsed.rows.length ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {parsed.rows.length} {parsed.rows.length === 1 ? "conteúdo encontrado" : "conteúdos encontrados"}
              </p>
              <ul className="space-y-2">
                {parsed.rows.slice(0, 8).map((row, i) => (
                  <li key={i} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm">
                    <span className="font-semibold text-v4">{shortFormat(row.format)}</span>
                    <span className="text-zinc-500"> · </span>
                    <span>{row.date || row.seasonal || (row.dateKind === "semana" ? `Semana ${row.week}` : "sem data")}</span>
                    <p className="mt-1 text-zinc-200">{row.idea || row.theme || "—"}</p>
                  </li>
                ))}
              </ul>
              {parsed.rows.length > 8 ? <p className="mt-2 text-xs text-zinc-500">+ {parsed.rows.length - 8} na lista</p> : null}
            </div>
          ) : null}

          <div className="flex rounded-xl bg-black p-1">
            <button
              type="button"
              onClick={() => setMode("append")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide ${mode === "append" ? "bg-v4 text-white" : "text-zinc-400"}`}
            >
              Somar aos atuais
            </button>
            <button
              type="button"
              onClick={() => setMode("replace")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide ${mode === "replace" ? "bg-v4 text-white" : "text-zinc-400"}`}
            >
              Trocar a lista
            </button>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4 md:px-6">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            type="button"
            disabled={!parsed.rows.length}
            className="btn-primary"
            onClick={() => onApply(parsed, mode)}
          >
            Preencher calendário
          </button>
        </div>
      </div>
    </div>
  );
}
