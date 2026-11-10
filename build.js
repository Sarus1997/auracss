const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('⚡ Building AuraCSS...');

let combinedCSS = '';

// 1. Read foundational styles in dependency order.
const baseFiles = ['_variables.css', '_base.css', '_grid.css'];
baseFiles.forEach(file => {
  const p = path.join(__dirname, 'src', 'css', file);
  if (!fs.existsSync(p)) throw new Error(`Missing stylesheet source: ${p}`);
  combinedCSS += fs.readFileSync(p, 'utf8') + '\n';
});

// 2. Read components in a stable order.
const compDir = path.join(__dirname, 'src', 'css', 'components');
if (!fs.existsSync(compDir)) throw new Error(`Missing component stylesheet directory: ${compDir}`);
fs.readdirSync(compDir).filter(f => f.endsWith('.css')).sort().forEach(file => {
  combinedCSS += fs.readFileSync(path.join(compDir, file), 'utf8') + '\n';
});

// 3. Add effects and utilities in the same order as the CSS entry point.
['_effects.css', '_utilities.css'].forEach(file => {
  const p = path.join(__dirname, 'src', 'css', file);
  if (!fs.existsSync(p)) throw new Error(`Missing stylesheet source: ${p}`);
  combinedCSS += fs.readFileSync(p, 'utf8') + '\n';
});

// 4. บันทึกไปที่ dist/aura.css
fs.writeFileSync(path.join(distDir, 'aura.css'), combinedCSS);
console.log('✅ CSS Compiled: dist/aura.css');

// 5. คัดลอก JS
const srcJS = path.join(__dirname, 'src', 'aura.js');
if (!fs.existsSync(srcJS)) throw new Error(`Missing JavaScript source: ${srcJS}`);
fs.copyFileSync(srcJS, path.join(distDir, 'aura.js'));
console.log('✅ JS Bundled: dist/aura.js');

// 6. Assemble the showcase from its page and component fragments.
const srcDir = path.join(__dirname, 'src');
const pageSource = path.join(srcDir, 'pages', 'index.html');
if (!fs.existsSync(pageSource)) throw new Error(`Missing page source: ${pageSource}`);

const includePattern = /<!--\s*@include\s+([\s\S]+?)\s*-->/g;
const pageTemplate = fs.readFileSync(pageSource, 'utf8');
const assembledPage = pageTemplate.replace(includePattern, (include, relativePath) => {
  const includePath = path.resolve(path.dirname(pageSource), relativePath.trim());
  const relativeToSrc = path.relative(srcDir, includePath);
  if (relativeToSrc.startsWith('..') || path.isAbsolute(relativeToSrc)) {
    throw new Error(`Page include is outside src/: ${relativePath.trim()}`);
  }
  if (!fs.existsSync(includePath)) throw new Error(`Missing page include: ${includePath}`);
  return fs.readFileSync(includePath, 'utf8');
});

if (/<!--\s*@include\s+[\s\S]+?\s*-->/.test(assembledPage)) {
  throw new Error('Unresolved page include found in src/pages/index.html');
}
fs.writeFileSync(path.join(__dirname, 'index.html'), assembledPage);
console.log('✅ HTML Assembled: index.html');

console.log('🎉 เสร็จเรียบร้อย พร้อมใช้งาน!');