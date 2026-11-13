const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const xlsx1 = 'C:\\Users\\Umesh\\.gemini\\antigravity\\brain\\e9f0e5d8-9c11-4293-98c3-0c797df815bf\\.user_uploaded\\media_1794547650194_8a37796e.xlsx';
const xlsx2 = 'C:\\Users\\Umesh\\.gemini\\antigravity\\brain\\e9f0e5d8-9c11-4293-98c3-0c797df815bf\\.user_uploaded\\media_1794547654517_a9a78d7a.xlsx';

function inspectXlsx(xlsxPath, label) {
  const tempZip = path.join(process.env.TEMP || 'C:\\temp', `${label}.zip`);
  const tempExtract = path.join(process.env.TEMP || 'C:\\temp', `${label}_extracted`);
  if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });
  fs.copyFileSync(xlsxPath, tempZip);
  cp.execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tempZip}' -DestinationPath '${tempExtract}' -Force"`, { stdio: 'inherit' });

  const workbookXml = fs.readFileSync(path.join(tempExtract, 'xl', 'workbook.xml'), 'utf8');
  console.log(`\n=== ${label} Workbook XML ===`);
  const sheets = workbookXml.match(/<sheet[^>]+name="([^"]+)"[^>]+sheetId="([^"]+)"/g) || [];
  sheets.forEach(s => console.log('Sheet:', s));
}

inspectXlsx(xlsx1, 'bio_part1');
inspectXlsx(xlsx2, 'bio_part2');

