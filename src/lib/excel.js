import ExcelJS from "exceljs";
import { DIAS } from "../constants";
import {
  asMonth,
  cellRichText,
  cellStr,
  cellText,
  dayStatus,
  monthParts,
  postsByDay,
  sheetName,
  weeksOfMonth,
  withRowIds,
  xmlEscape,
} from "./calendar";
import { downloadBlob } from "./download";

const STATUS_COLOR = {
  vazio: "FFFFFFFF",
  Postado: "FFC6E0B4",
  Programado: "FFFFE08A",
  Cancelado: "FFF5C6CB",
  Brifado: "FFFFFFFF",
  Sazonal: "FFFDECEC",
  Out: "FFE5E5E5",
};

const ROW_HEADERS = ["dateKind", "date", "week", "seasonal", "format", "theme", "idea", "objective", "status"];

function thinBorder() {
  const c = { argb: "FFBFBFBF" };
  return {
    top: { style: "thin", color: c },
    left: { style: "thin", color: c },
    bottom: { style: "thin", color: c },
    right: { style: "thin", color: c },
  };
}

function fillArgb(argb) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function applyDayPair(dateCell, bodyCell, day, posts) {
  const st = day == null ? "Out" : dayStatus(posts);
  const seasonal = st === "Sazonal";
  const argb = seasonal ? "FFFDECEC" : (STATUS_COLOR[st] || STATUS_COLOR.vazio);
  const red = { argb: "FFE50914" };
  dateCell.value = day || "";
  dateCell.alignment = { horizontal: "right", vertical: "middle" };
  dateCell.font = {
    name: "Calibri",
    size: 10,
    bold: seasonal,
    color: { argb: seasonal ? "FFFFFFFF" : (day ? "FF666666" : "FFB3B3B3") },
  };
  dateCell.fill = fillArgb(seasonal ? "FFE50914" : argb);
  dateCell.border = {
    top: { style: "thin", color: seasonal ? red : { argb: "FFBFBFBF" } },
    left: { style: "thin", color: seasonal ? red : { argb: "FFBFBFBF" } },
    right: { style: "thin", color: seasonal ? red : { argb: "FFBFBFBF" } },
  };
  bodyCell.value = day ? cellRichText(posts) : "";
  bodyCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
  bodyCell.font = { name: "Calibri", size: 10, color: { argb: seasonal ? "FFE50914" : "FF000000" } };
  bodyCell.fill = fillArgb(argb);
  bodyCell.border = {
    left: { style: "thin", color: seasonal ? red : { argb: "FFBFBFBF" } },
    right: { style: "thin", color: seasonal ? red : { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: seasonal ? red : { argb: "FFBFBFBF" } },
  };
}

function addCalendarioSheet(wb, data, label, weeks, byDay) {
  const header = "FF1B4D3E";
  const ws = wb.addWorksheet(sheetName(data.brand || label), {
    views: [{ state: "frozen", ySplit: 2, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9,
      margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [1, 2, 3, 4, 5, 6, 7].map(() => ({ width: 22 })).concat([{ width: 3 }, { width: 20 }]);

  ws.mergeCells("A1:G1");
  const title = ws.getCell("A1");
  title.value = label;
  title.font = { name: "Arial", size: 28, bold: true, color: { argb: header } };
  title.alignment = { horizontal: "left", vertical: "middle" };
  title.fill = fillArgb("FFF2F2F2");
  ws.getRow(1).height = 38;
  for (let i = 1; i <= 7; i++) ws.getCell(1, i).fill = fillArgb("FFF2F2F2");

  const headFill = fillArgb(header);
  const headFont = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  DIAS.forEach((d, i) => {
    const c = ws.getCell(2, i + 1);
    c.value = d;
    c.fill = headFill;
    c.font = headFont;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder();
  });
  const legHead = ws.getCell(2, 9);
  legHead.value = "Legenda";
  legHead.fill = headFill;
  legHead.font = headFont;
  legHead.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  const legend = [
    ["Sazonal", "FFE50914"],
    ["Postado", "FFC6E0B4"],
    ["Programado", "FFFFE08A"],
    ["Cancelado", "FFF5C6CB"],
    ["Brifado", "FFFFFFFF"],
  ];

  let r = 3;
  weeks.forEach((week, wi) => {
    ws.getRow(r).height = 16;
    ws.getRow(r + 1).height = 96;
    week.forEach((day, i) => {
      applyDayPair(ws.getCell(r, i + 1), ws.getCell(r + 1, i + 1), day, byDay[day]);
    });
    if (legend[wi]) {
      ws.mergeCells(r, 9, r + 1, 9);
      const box = ws.getCell(r, 9);
      box.value = legend[wi][0];
      box.fill = fillArgb(legend[wi][1]);
      box.font = { name: "Calibri", size: 11, italic: true, color: { argb: legend[wi][0] === "Sazonal" ? "FFFFFFFF" : "FF000000" } };
      box.alignment = { horizontal: "left", vertical: "bottom" };
      box.border = {
        top: { style: "thin", color: { argb: "FF1A1A1A" } },
        left: { style: "thin", color: { argb: "FF1A1A1A" } },
        bottom: { style: "thin", color: { argb: "FF1A1A1A" } },
        right: { style: "thin", color: { argb: "FF1A1A1A" } },
      };
    }
    r += 2;
  });
}

function addDadosSheet(wb, data) {
  const ws = wb.addWorksheet("DadosV4");
  ws.state = "hidden";
  ws.getCell("A1").value = "V4DADOS";
  ["brand", "month", "channel", "monthGoal"].forEach((h, i) => {
    ws.getCell(2, i + 1).value = h;
    ws.getCell(3, i + 1).value = data[h] || "";
  });
  ROW_HEADERS.forEach((h, i) => { ws.getCell(5, i + 1).value = h; });
  (data.rows || []).forEach((row, ri) => {
    ROW_HEADERS.forEach((h, i) => { ws.getCell(6 + ri, i + 1).value = row[h] ?? ""; });
  });
}

function xmlCell(style, value, extra = "") {
  if (value === "" || value == null) return `<Cell ss:StyleID="${style}"${extra}/>`;
  const type = typeof value === "number" ? "Number" : "String";
  const space = type === "String" ? ' xml:space="preserve"' : "";
  const data = type === "Number" ? String(value) : xmlEscape(value).replaceAll("\n", "&#10;");
  return `<Cell ss:StyleID="${style}"${extra}><Data ss:Type="${type}"${space}>${data}</Data></Cell>`;
}

function gridBorder(edge) {
  const c = "#BFBFBF";
  const top = edge === "top" || edge === "all";
  const bottom = edge === "bottom" || edge === "all";
  return `<Borders>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${c}"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${c}"/>
    ${top ? `<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${c}"/>` : ""}
    ${bottom ? `<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${c}"/>` : ""}
   </Borders>`;
}

function stylePair(status, color, isOut) {
  const key = isOut ? "Out" : status;
  return `<Style ss:ID="sDate_${key}">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#666666"/>
   <Interior ss:Color="#${color}" ss:Pattern="Solid"/>
   ${gridBorder("top")}
  </Style>
  <Style ss:ID="sBody_${key}">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#000000"/>
   <Interior ss:Color="#${color}" ss:Pattern="Solid"/>
   ${gridBorder("bottom")}
  </Style>`;
}

function legendStyle(color) {
  return `
   <Alignment ss:Horizontal="Left" ss:Vertical="Bottom" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#000000"/>
   <Interior ss:Color="#${color}" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1A1A1A"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1A1A1A"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1A1A1A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1A1A1A"/>
   </Borders>`;
}

function exportExcelXml(data, year, label, weeks, byDay) {
  const legend = [
    ["Sazonal", "sLegSazonal"],
    ["Postado", "sLegPostado"],
    ["Programado", "sLegProgramado"],
    ["Cancelado", "sLegCancelado"],
    ["Brifado", "sLegBrifado"],
  ];
  const headerCells = DIAS.map((d) => xmlCell("sDayHead", d)).join("") + xmlCell("sLegHead", "Legenda", ' ss:Index="9"');
  let body = "";
  weeks.forEach((week, wi) => {
    const dateCells = week.map((day) => {
      if (!day) return xmlCell("sDateOut", "");
      return xmlCell("sDate_" + dayStatus(byDay[day]), day);
    }).join("");
    const contentCells = week.map((day) => {
      if (!day) return xmlCell("sBodyOut", "");
      const posts = byDay[day];
      return xmlCell("sBody_" + dayStatus(posts), cellText(posts));
    }).join("");
    const legendBox = legend[wi] ? xmlCell(legend[wi][1], legend[wi][0], ' ss:Index="9" ss:MergeDown="1"') : "";
    body += `<Row ss:Height="16">${dateCells}${legendBox}</Row>\n`;
    body += `<Row ss:Height="92">${contentCells}</Row>\n`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
  </Style>
  <Style ss:ID="sTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="28" ss:Bold="1" ss:Color="#1B4D3E"/>
   <Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sDayHead">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B4D3E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sLegHead">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B4D3E" ss:Pattern="Solid"/>
  </Style>
  ${stylePair("vazio", "FFFFFF")}
  ${stylePair("Postado", "C6E0B4")}
  ${stylePair("Programado", "FFE08A")}
  ${stylePair("Cancelado", "F5C6CB")}
  ${stylePair("Brifado", "FFFFFF")}
  <Style ss:ID="sDate_Sazonal">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#E50914" ss:Pattern="Solid"/>
   ${gridBorder("top")}
  </Style>
  <Style ss:ID="sBody_Sazonal">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#E50914"/>
   <Interior ss:Color="#FDECEC" ss:Pattern="Solid"/>
   ${gridBorder("bottom")}
  </Style>
  ${stylePair("Out", "E5E5E5", true)}
  <Style ss:ID="sDateOut">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#B3B3B3"/>
   <Interior ss:Color="#E5E5E5" ss:Pattern="Solid"/>
   ${gridBorder("top")}
  </Style>
  <Style ss:ID="sBodyOut">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
   <Interior ss:Color="#E5E5E5" ss:Pattern="Solid"/>
   ${gridBorder("bottom")}
  </Style>
  <Style ss:ID="sBody_vazio">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
  </Style>
  <Style ss:ID="sLegSazonal">${legendStyle("E50914")}</Style>
  <Style ss:ID="sLegPostado">${legendStyle("C6E0B4")}</Style>
  <Style ss:ID="sLegProgramado">${legendStyle("FFE08A")}</Style>
  <Style ss:ID="sLegCancelado">${legendStyle("F5C6CB")}</Style>
  <Style ss:ID="sLegBrifado">${legendStyle("FFFFFF")}</Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(sheetName(data.brand || label))}">
  <Table ss:ExpandedColumnCount="9" ss:ExpandedRowCount="${2 + weeks.length * 2}">
   <Column ss:Index="1" ss:AutoFitWidth="0" ss:Width="132"/>
   <Column ss:Index="2" ss:AutoFitWidth="0" ss:Width="132"/>
   <Column ss:Index="3" ss:AutoFitWidth="0" ss:Width="132"/>
   <Column ss:Index="4" ss:AutoFitWidth="0" ss:Width="132"/>
   <Column ss:Index="5" ss:AutoFitWidth="0" ss:Width="132"/>
   <Column ss:Index="6" ss:AutoFitWidth="0" ss:Width="132"/>
   <Column ss:Index="7" ss:AutoFitWidth="0" ss:Width="132"/>
   <Column ss:Index="8" ss:AutoFitWidth="0" ss:Width="14"/>
   <Column ss:Index="9" ss:AutoFitWidth="0" ss:Width="128"/>
   <Row ss:Height="38">${xmlCell("sTitle", label, ' ss:MergeAcross="6"')}</Row>
   <Row ss:Height="22">${headerCells}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`;
  const blob = new Blob(["\uFEFF" + xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, `Calendario-${label}-${year}.xls`);
}

async function exportExcelXlsx(data, year, label, weeks, byDay) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "V4 Company";
  addCalendarioSheet(wb, data, label, weeks, byDay);
  addDadosSheet(wb, data);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `Calendario-${label}-${year}.xlsx`);
}

export async function exportExcel(data) {
  const { year, month, label } = monthParts(data);
  const weeks = weeksOfMonth(year, month);
  const byDay = postsByDay(data, year, month);
  try {
    await exportExcelXlsx(data, year, label, weeks, byDay);
  } catch (err) {
    console.warn("xlsx falhou, usando formato Excel XML", err);
    exportExcelXml(data, year, label, weeks, byDay);
  }
}

export async function importExcel(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet("DadosV4") || wb.worksheets.find((s) => String(s.getCell("A1").value || "") === "V4DADOS");
  if (!ws) throw new Error("Este Excel não tem código de recuperação. Exporte de novo por este planner.");
  const data = {
    brand: cellStr(ws.getCell(3, 1)),
    month: asMonth(cellStr(ws.getCell(3, 2))),
    channel: cellStr(ws.getCell(3, 3)),
    monthGoal: cellStr(ws.getCell(3, 4)),
    rows: [],
  };
  for (let r = 6; r <= (ws.rowCount || 6); r++) {
    const row = {};
    ROW_HEADERS.forEach((h, i) => { row[h] = cellStr(ws.getCell(r, i + 1)); });
    if (!row.dateKind && !row.date && !row.idea && !row.theme) continue;
    data.rows.push(row);
  }
  if (!data.rows.length) data.rows.push({});
  return withRowIds(data);
}
