const fs = require("fs");
const p =
  "c:/Users/Santiago/Desktop/V2.7 - Mejorando a V2.8/Data/tmp_optimizador_script.js";
const s = fs.readFileSync(p, "utf8");
const lines = s.split("\n");
let depth = { brace: 0, paren: 0, brack: 0 };
let inS = false,
  inD = false,
  inT = false,
  esc = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (esc) {
      esc = false;
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
  }
  if (i > 250 && i < 330)
    console.log(
      i + 1 + ":",
      "paren",
      depth.paren,
      "brace",
      depth.brace,
      "brack",
      depth.brack,
      "|",
      lines[i].trim(),
    );
}
console.log("FINAL", depth);
