import { withRowIds } from "./calendar";
import { importExcel } from "./excel";
import { importPdf } from "./pdf";

export async function importAnyFile(file, current, onProgress) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".pdf")) {
    return { data: await importPdf(file, current, onProgress), origin: "PDF" };
  }
  if (name.endsWith(".json")) {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.rows)) throw new Error("Arquivo sem dados de calendário");
    return { data: withRowIds(parsed), origin: "arquivo" };
  }
  return { data: await importExcel(file), origin: "Excel" };
}
