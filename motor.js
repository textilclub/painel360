// Motor: roda as fórmulas da planilha original (HyperFormula) com os dados da empresa.
(function (root) {
  const HFlib = () => (typeof HyperFormula !== "undefined" ? HyperFormula : require("hyperformula").HyperFormula);
  const colNum = s => s.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const colStr = n => { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const parseA1 = a => { const m = /^([A-Z]+)(\d+)$/.exec(a); return { col: colNum(m[1]) - 1, row: +m[2] - 1 }; };

  let registrado = false;
  function registrar(HF) {
    if (registrado) return; registrado = true;
    const lib = typeof HyperFormula !== "undefined" ? HyperFormula : require("hyperformula");
    const { FunctionPlugin, FunctionArgumentType } = lib;
    const fmt = (n, dec) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    class FmtPT extends FunctionPlugin {
      fixed(ast, state) { return this.runFunction(ast.args, state, this.metadata("FIXED"), (n, d) => fmt(n, Math.max(0, Math.round(d)))); }
      text(ast, state) { return this.runFunction(ast.args, state, this.metadata("TEXT"), (n, f) => {
        f = String(f); const pct = f.includes("%"); const dec = (f.split(".")[1] || "").replace(/[^0#]/g, "").length;
        return fmt(pct ? n * 100 : n, dec) + (pct ? "%" : ""); }); }
      n(ast, state) { return this.runFunction(ast.args, state, this.metadata("N"), v => typeof v === "number" ? v : (v === true ? 1 : 0)); }
    }
    FmtPT.implementedFunctions = {
      N: { method: "n", parameters: [{ argumentType: FunctionArgumentType.SCALAR }] },
      FIXED: { method: "fixed", parameters: [{ argumentType: FunctionArgumentType.NUMBER }, { argumentType: FunctionArgumentType.NUMBER, defaultValue: 2 }] },
      TEXT: { method: "text", parameters: [{ argumentType: FunctionArgumentType.NUMBER }, { argumentType: FunctionArgumentType.STRING }] },
    };
    try { HF.unregisterFunction("TEXT"); } catch (e) {}
    HF.registerFunctionPlugin(FmtPT, { enGB: { FIXED: "FIXED", TEXT: "TEXT", N: "N" } });
  }

  function criar(modelo, celulas) {
    const HF = HFlib(); registrar(HF);
    const sheets = {};
    for (const sh of modelo.sheets) {
      const grid = Array.from({ length: sh.maxRow }, () => Array(sh.maxCol).fill(null));
      for (const [a1, c] of Object.entries(sh.cells)) {
        const { row, col } = parseA1(a1);
        if (row >= sh.maxRow || col >= sh.maxCol) continue;
        grid[row][col] = c.f !== undefined ? c.f.replace(/INDEX\(([^,()]+),MATCH\(/g, "INDEX($1,1,MATCH(") : (c.v !== undefined ? c.v : null);
      }
      // entradas: limpa o valor do modelo (vem só dos dados da empresa)
      for (const a1 of Object.keys(modelo.inputs[sh.name] || {})) { const { row, col } = parseA1(a1); grid[row][col] = null; }
      sheets[sh.name] = grid;
    }
    for (const [k, v] of Object.entries(celulas || {})) {
      const i = k.lastIndexOf("!"); const s = k.slice(0, i), { row, col } = parseA1(k.slice(i + 1));
      if (sheets[s] && v !== "" && v !== null && v !== undefined) sheets[s][row][col] = v;
    }
    const hf = HF.buildFromSheets(sheets, { licenseKey: "gpl-v3", useArrayArithmetic: false, precisionRounding: 10, smartRounding: true, nullDate: { year: 1899, month: 12, day: 30 } });
    const ids = {}; for (const s of Object.keys(sheets)) ids[s] = hf.getSheetId(s);
    const api = {
      hf, ids,
      get(sheet, a1) { const { row, col } = parseA1(a1); const v = hf.getCellValue({ sheet: ids[sheet], row, col }); return (v && typeof v === "object") ? null : v; },
      set(sheet, a1, v) { const { row, col } = parseA1(a1); hf.setCellContents({ sheet: ids[sheet], row, col }, [[v === "" ? null : v]]); },
      setMany(map) { hf.batch(() => { for (const [k, v] of Object.entries(map)) { const i = k.lastIndexOf("!"); api.set(k.slice(0, i), k.slice(i + 1), v); } }); },
      valores(sheet) { return hf.getSheetValues(ids[sheet]); },
    };
    return api;
  }
  root.TC_MOTOR = { criar, parseA1, colStr, colNum };
  if (typeof module !== "undefined") module.exports = root.TC_MOTOR;
})(typeof window !== "undefined" ? window : globalThis);
