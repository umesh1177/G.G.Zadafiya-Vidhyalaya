const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const docx1 = 'C:\\Users\\Umesh\\.gemini\\antigravity\\brain\\e9f0e5d8-9c11-4293-98c3-0c797df815bf\\.user_uploaded\\media_1794547660857_c346281c.docx';
const docx2 = 'C:\\Users\\Umesh\\.gemini\\antigravity\\brain\\e9f0e5d8-9c11-4293-98c3-0c797df815bf\\.user_uploaded\\media_1794547667410_9f6ec3c1.docx';

function checkDocx(docxPath, label) {
  const tempZip = path.join(process.env.TEMP || 'C:\\temp', `${label}.zip`);
  const tempExtract = path.join(process.env.TEMP || 'C:\\temp', `${label}_extracted`);
  
  if (fs.existsSync(tempExtract)) {
    fs.rmSync(tempExtract, { recursive: true, force: true });
  }
  
  fs.copyFileSync(docxPath, tempZip);
  cp.execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tempZip}' -DestinationPath '${tempExtract}' -Force"`, { stdio: 'inherit' });
  
  const mediaDir = path.join(tempExtract, 'word', 'media');
  if (fs.existsSync(mediaDir)) {
    const files = fs.readdirSync(mediaDir);
    console.log(`${label}: Found ${files.length} images`);
    files.forEach(f => {
      const s = fs.statSync(path.join(mediaDir, f));
      console.log(` - ${f}: ${s.size} bytes`);
    });
  } else {
    console.log(`${label}: No images found in word/media`);
  }
}

console.log('Checking docx 1 (Maths Part 1)...');
checkDocx(docx1, 'maths_part1');

console.log('\nChecking docx 2 (Maths Part 2)...');
checkDocx(docx2, 'maths_part2');

