import { dateSortKey, formatPrintWhen, monthParts, shortFormat } from "../lib/calendar";

export function PrintPack({ data }) {
  const { year, month, label } = monthParts(data);
  const brand = data.brand || "V4 Company";
  const channel = data.channel || "A definir";
  const goal = data.monthGoal || "A definir com o cliente";
  const rows = [...(data.rows || [])].sort((a, b) => dateSortKey(a).localeCompare(dateSortKey(b)));

  return (
    <div className="print-pack" id="printPack">
      <header className="print-hero">
        <div className="print-brand">
          <span className="print-mark" />
          <div>
            <p className="print-kicker">V4 Company</p>
            <h1>Calendário macro de conteúdo</h1>
          </div>
        </div>
        <div className="print-month">
          <strong>{label}</strong>
          <span>{year} · material para o cliente</span>
        </div>
      </header>
      <section className="print-meta">
        <article><p>Cliente</p><strong>{brand}</strong></article>
        <article><p>Canal</p><strong>{channel}</strong></article>
        <article><p>Objetivo do mês</p><strong>{goal}</strong></article>
      </section>
      <div className="print-list">
        <div className="print-row is-head">
          <div>Data</div>
          <div>Formato</div>
          <div>Tema</div>
          <div>Ideia central</div>
          <div>Objetivo</div>
        </div>
        {rows.length ? rows.map((p, i) => {
          const when = formatPrintWhen(p, year, month);
          const sazonal = (p.dateKind || "dia") === "sazonal";
          return (
            <div key={p.id || i} className={`print-row is-item${sazonal ? " is-sazonal" : ""}`}>
              <div className="print-date">
                {sazonal ? (
                  <>
                    <span className="print-flag">Sazonal</span>
                    {p.seasonal ? <span className="print-flag-name">{p.seasonal}</span> : null}
                  </>
                ) : null}
                <small>{when.week}</small>
                {when.day}
              </div>
              <div className="print-format">{shortFormat(p.format)}</div>
              <div>{p.theme || "—"}</div>
              <div className="print-idea">{p.idea || "—"}</div>
              <div>{p.objective || "—"}</div>
            </div>
          );
        }) : (
          <p className="print-empty">Nenhum conteúdo cadastrado neste mês.</p>
        )}
      </div>
    </div>
  );
}
