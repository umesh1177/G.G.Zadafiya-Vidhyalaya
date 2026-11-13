const fs = require('fs');
const path = require('path');

function inspectMathsTables(label) {
  const tempExtract = path.join(process.env.TEMP || 'C:\\temp', `${label}_extracted`);
  const docXml = fs.readFileSync(path.join(tempExtract, 'word', 'document.xml'), 'utf8');

  const tables = docXml.split(/<w:tbl(?: |>)/).slice(1);
  console.log(`\n=== ${label}: ${tables.length} tables ===`);

  tables.forEach((tbl, tIdx) => {
    const rows = tbl.split(/<w:tr(?: |>)/).slice(1);
    const firstRow = rows[0] || '';
    const cells = firstRow.split(/<w:tc(?: |>)/).slice(1);
    const headers = cells.map(c => {
      const texts = c.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
      return texts.map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
    });
    console.log(`Table ${tIdx + 1} (${rows.length} rows): Header = [${headers.join(' | ')}]`);
  });
}

inspectMathsTables('maths_part1');
inspectMathsTables('maths_part2');

