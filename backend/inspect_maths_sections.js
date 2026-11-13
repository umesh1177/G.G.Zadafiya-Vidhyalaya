const fs = require('fs');
const path = require('path');

function inspectPartStructure(label) {
  const tempExtract = path.join(process.env.TEMP || 'C:\\temp', `${label}_extracted`);
  const docXml = fs.readFileSync(path.join(tempExtract, 'word', 'document.xml'), 'utf8');

  // Find paragraphs and tables in order
  const elements = docXml.split(/(<w:p(?: |>)|<w:tbl(?: |>))/);
  let currentCh = '';
  let currentSection = '';
  const sections = [];

  let isTable = false;
  let textBuffer = '';

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.startsWith('<w:p')) {
      const pContent = elements[i+1] || '';
      const textMatches = pContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
      const text = textMatches.map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
      if (text) {
        if (text.includes('પ્રકરણ ') || text.includes('પ્રકરણવાર')) {
          currentCh = text;
        } else if (text.includes('ઉદાહરણો') || text.includes('સ્વાધ્યાય') || text.includes('પ્રકીર્ણ')) {
          currentSection = text;
        }
      }
    } else if (el.startsWith('<w:tbl')) {
      const tblContent = elements[i+1] || '';
      const rows = tblContent.split(/<w:tr(?: |>)/).slice(1);
      sections.push({
        ch: currentCh,
        section: currentSection,
        rowCount: rows.length,
      });
    }
  }

  console.log(`\n=== ${label} Sections (${sections.length}) ===`);
  sections.forEach((s, idx) => {
    console.log(`Table ${idx + 1}: [${s.ch}] -> [${s.section}] (${s.rowCount} rows)`);
  });

  return sections;
}

inspectPartStructure('maths_part1');
inspectPartStructure('maths_part2');

