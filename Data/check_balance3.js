const fs = require("fs");
const p =
  "c:/Users/Santiago/Desktop/V2.7 - Mejorando a V2.8/Data/tmp_optimizador_script.js";
const s = fs.readFileSync(p, "utf8");
const lines = s.split("\n");
let depth = { brace: 0, paren: 0, brack: 0 };
let inS = false,
  inD = false,
  inT = false,
  esc = false,
  inLineComment = false,
  inBlockComment = false;
let firstNeg = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    const next = j + 1 < line.length ? line[j + 1] : "\n";
    if (esc) {
      esc = false;
      continue;
    }
    if (inLineComment) break;
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        j++;
      }
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (inS) {
      if (ch === "'") inS = false;
      continue;
    }
    if (inD) {
      if (ch === '"') inD = false;
      continue;
    }
    if (inT) {
      if (ch === "`") inT = false;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      break;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      j++;
      continue;
    }
    if (ch === "'") {
      inS = true;
      continue;
    }
    if (ch === '"') {
      inD = true;
      continue;
    }
    if (ch === "`") {
      inT = true;
      continue;
    }
    if (ch === "{") depth.brace++;
    if (ch === "}") depth.brace--;
    if (ch === "(") depth.paren++;
    if (ch === ")") depth.paren--;
    if (ch === "[") depth.brack++;
    if (ch === "]") depth.brack--;
    if (!firstNeg && (depth.brace < 0 || depth.paren < 0 || depth.brack < 0)) {
      firstNeg = { line: i + 1, char: j + 1, state: { ...depth }, text: line };
    }
  }
  inLineComment = false;
}
console.log("first negative:", firstNeg);
console.log("final depth", depth);
console.log("tail of file:");
for (let i = lines.length - 60; i < lines.length; i++)
  if (i >= 0) console.log(i + 1 + ": " + lines[i]);
