import { DATE_KINDS, FORMATS, STATUS_META, STATUSES } from "../constants";
import { weekOptions } from "../lib/calendar";
import { IconDup, IconTrash } from "./Icons";

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-v4";
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

export function PostCard({ row, index, month, onChange, onDuplicate, onDelete }) {
  const kind = row.dateKind || "dia";
  const weeks = weekOptions(month, row.week);
  const seasonal = kind === "sazonal";

  function patch(partial) {
    onChange({ ...row, ...partial });
  }

  return (
    <article
      className={`rounded-2xl border bg-panel p-4 shadow-sm transition md:p-5 ${
        seasonal ? "border-v4/70 ring-1 ring-v4/30" : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-black text-xs font-bold tabular-nums text-zinc-400">
            {index + 1}
          </span>
          <div className="flex rounded-xl bg-black p-1">
            {DATE_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => patch({ dateKind: k.value })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  kind === k.value ? "bg-v4 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-black p-1">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => patch({ status })}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                  row.status === status ? STATUS_META[status].className + " border" : "text-zinc-500 hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <button type="button" title="Duplicar" onClick={onDuplicate} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:border-v4 hover:text-v4">
            <IconDup />
          </button>
          <button type="button" title="Apagar" onClick={onDelete} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:border-v4 hover:text-v4">
            <IconTrash />
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {kind === "sazonal" && (
          <div>
            <label className={labelClass}>Data sazonal</label>
            <input
              className={fieldClass}
              list="seasonalDates"
              placeholder="Ex.: Natal, Black Friday"
              value={row.seasonal || ""}
              onChange={(e) => patch({ seasonal: e.target.value })}
            />
          </div>
        )}
        {kind !== "semana" && (
          <div>
            <label className={labelClass}>{kind === "sazonal" ? "Data da postagem" : "Data"}</label>
            <input
              className={fieldClass}
              type="date"
              value={row.date || ""}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </div>
        )}
        {kind === "semana" && (
          <div className="md:col-span-2">
            <label className={labelClass}>Semana do mês</label>
            <select
              className={fieldClass}
              value={row.week || "1"}
              onChange={(e) => patch({ week: e.target.value })}
            >
              {weeks.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className={labelClass}>Formato</p>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => patch({ format })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                row.format === format
                  ? "border-v4 bg-v4 text-white"
                  : "border-white/10 bg-black text-zinc-300 hover:border-white/30"
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className={labelClass}>Tema</label>
          <textarea
            className={`${fieldClass} min-h-[92px] resize-y`}
            placeholder="Assunto ou pilar"
            value={row.theme}
            onChange={(e) => patch({ theme: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Ideia central</label>
          <textarea
            className={`${fieldClass} min-h-[92px] resize-y`}
            placeholder="A mensagem em uma frase"
            value={row.idea}
            onChange={(e) => patch({ idea: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Objetivo</label>
          <textarea
            className={`${fieldClass} min-h-[92px] resize-y`}
            placeholder="O que este conteúdo precisa gerar?"
            value={row.objective}
            onChange={(e) => patch({ objective: e.target.value })}
          />
        </div>
      </div>
    </article>
  );
}
