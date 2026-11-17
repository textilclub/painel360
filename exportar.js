// Exporta a planilha original (com fórmulas, formatação e gráficos) preenchida com os dados da empresa.
(function (root) {
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const colNum = s => s.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const splitA1 = a => { const m = /^([A-Z]+)(\d+)$/.exec(a); return [m[1], +m[2]]; };

  async function exportar(JSZip, templateBuf, modelo, celulas, motor) {
    const zip = await JSZip.loadAsync(templateBuf);
    const wbXml = await zip.file("xl/workbook.xml").async("string");
    const rels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
    const relMap = {}; rels.replace(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g, (m, id, t) => { relMap[id] = t; });
    rels.replace(/<Relationship[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g, (m, t, id) => { relMap[id] = relMap[id] || t; });
    const sheetFiles = {};
    wbXml.replace(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g, (m, name, id) => {
      const nm = name.replace(/&amp;/g, "&"); let t = relMap[id]; t = t.replace(/^\/?xl\//, ""); sheetFiles[nm] = "xl/" + t;
    });

    for (const sh of modelo.sheets) {
      const path = sheetFiles[sh.name]; if (!path) continue;
      let xml = await zip.file(path).async("string");
      const inputs = modelo.inputs[sh.name] || {};
      const vals = motor.valores(sh.name);
      const done = new Set();

      const cellXml = (ref, attrs, f) => {
        const s = (/\bs="(\d+)"/.exec(attrs) || [])[1];
        const sAttr = s ? ` s="${s}"` : "";
        if (inputs[ref] !== undefined) {
          const v = celulas[`${sh.name}!${ref}`];
          if (v === undefined || v === null || v === "") return `<c r="${ref}"${sAttr}/>`;
          if (typeof v === "number") return `<c r="${ref}"${sAttr}><v>${v}</v></c>`;
          return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
        }
        if (f !== undefined) {
          const [c, r] = splitA1(ref); const v = vals[r - 1] ? vals[r - 1][colNum(c) - 1] : null;
          if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${sAttr}><f>${f}</f><v>${v}</v></c>`;
          if (typeof v === "string") return `<c r="${ref}"${sAttr} t="str"><f>${f}</f><v>${esc(v)}</v></c>`;
          if (typeof v === "boolean") return `<c r="${ref}"${sAttr} t="b"><f>${f}</f><v>${v ? 1 : 0}</v></c>`;
          return `<c r="${ref}"${sAttr}><f>${f}</f></c>`;
        }
        return null;
      };

      xml = xml.replace(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (m, ref, attrs, inner) => {
        const fm = inner ? /<f[^>]*>([\s\S]*?)<\/f>/.exec(inner) : null;
        const out = cellXml(ref, attrs, fm ? fm[1] : undefined);
        if (inputs[ref] !== undefined) done.add(ref);
        return out === null ? m : out;
      });

      // entradas preenchidas que não existiam no XML: insere na linha certa
      const faltam = Object.keys(inputs).filter(ref => !done.has(ref) && celulas[`${sh.name}!${ref}`] !== undefined && celulas[`${sh.name}!${ref}`] !== null && celulas[`${sh.name}!${ref}`] !== "");
      if (faltam.length) {
        const porLinha = {}; faltam.forEach(ref => { const [, r] = splitA1(ref); (porLinha[r] = porLinha[r] || []).push(ref); });
        for (const [r, refs] of Object.entries(porLinha)) {
          const novos = refs.map(ref => cellXml(ref, "", undefined));
          const rowRe = new RegExp(`<row r="${r}"([^>]*?)(?:/>|>([\\s\\S]*?)</row>)`);
          if (rowRe.test(xml)) {
            xml = xml.replace(rowRe, (m, attrs, inner) => {
              const cells = (inner || "").match(/<c r="[A-Z]+\d+"[\s\S]*?(?:\/>|<\/c>)/g) || [];
              const all = cells.concat(novos).sort((a, b) => colNum(/r="([A-Z]+)/.exec(a)[1]) - colNum(/r="([A-Z]+)/.exec(b)[1]));
              return `<row r="${r}"${attrs.replace(/\s*spans="[^"]*"/, "")}>${all.join("")}</row>`;
            });
          } else {
            const rows = xml.match(/<row r="(\d+)"/g) || [];
            const after = rows.map(x => +/\d+/.exec(x)[0]).filter(n => n < +r).pop();
            const rowXml = `<row r="${r}">${novos.sort((a, b) => colNum(/r="([A-Z]+)/.exec(a)[1]) - colNum(/r="([A-Z]+)/.exec(b)[1])).join("")}</row>`;
            if (after) xml = xml.replace(new RegExp(`(<row r="${after}"[^>]*?(?:/>|>[\\s\\S]*?</row>))`), `$1${rowXml}`);
            else xml = xml.replace("<sheetData>", `<sheetData>${rowXml}`);
          }
        }
      }
      zip.file(path, xml);
    }
    // recalcula tudo ao abrir no Excel
    let wb2 = wbXml;
    if (/<calcPr[^>]*\/>/.test(wb2)) wb2 = wb2.replace(/<calcPr([^>]*?)\/>/, (m, a) => `<calcPr${a.replace(/\s*fullCalcOnLoad="[^"]*"/, "")} fullCalcOnLoad="1"/>`);
    else wb2 = wb2.replace("</workbook>", `<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
    zip.file("xl/workbook.xml", wb2);
    return zip.generateAsync({ type: typeof window !== "undefined" ? "blob" : "nodebuffer", compression: "DEFLATE",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  root.TC_EXPORT = { exportar };
  if (typeof module !== "undefined") module.exports = root.TC_EXPORT;
})(typeof window !== "undefined" ? window : globalThis);
