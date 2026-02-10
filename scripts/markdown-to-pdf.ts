/**
 * Converts a Markdown file to PDF using pdfkit.
 * Usage: npx tsx scripts/markdown-to-pdf.ts <path-to.md>
 * Example: npx tsx scripts/markdown-to-pdf.ts docs/STAKEHOLDER_PRODUCT_OVERVIEW.md
 */
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const MARGIN = 50;
const PAGE_WIDTH = 595; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function stripBold(text: string): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = [];
  let rest = text;
  while (rest.length > 0) {
    const i = rest.indexOf('**');
    if (i === -1) {
      if (rest.length) parts.push({ text: rest, bold: false });
      break;
    }
    if (i > 0) parts.push({ text: rest.slice(0, i), bold: false });
    const j = rest.indexOf('**', i + 2);
    if (j === -1) {
      parts.push({ text: rest.slice(i + 2), bold: false });
      break;
    }
    parts.push({ text: rest.slice(i + 2, j), bold: true });
    rest = rest.slice(j + 2);
  }
  return parts;
}

function writeLine(
  doc: InstanceType<typeof PDFDocument>,
  line: string,
  opts: { fontSize?: number; bold?: boolean; indent?: number; bullet?: boolean } = {}
) {
  const fontSize = opts.fontSize ?? 10;
  const indent = opts.indent ?? 0;
  const bullet = opts.bullet ?? false;
  if (doc.y > 750) {
    doc.addPage();
    doc.y = MARGIN;
  }
  const maxWidth = CONTENT_WIDTH - indent - (bullet ? 12 : 0);
  const startX = MARGIN + indent + (bullet ? 12 : 0);
  if (bullet) {
    doc.fontSize(fontSize).font('Helvetica').text('• ', MARGIN, doc.y);
  }
  const chunks = stripBold(line);
  chunks.forEach((part, idx) => {
    doc.fontSize(fontSize).font(part.bold ? 'Helvetica-Bold' : 'Helvetica');
    if (idx === 0) {
      doc.text(part.text, startX, doc.y, { width: maxWidth, continued: idx < chunks.length - 1 });
    } else {
      doc.text(part.text, { width: maxWidth, continued: idx < chunks.length - 1 });
    }
  });
  doc.moveDown(0.4);
}

function isTableRow(line: string): boolean {
  return line.startsWith('|') && line.trim().endsWith('|');
}

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function writeTableRow(doc: InstanceType<typeof PDFDocument>, cells: string[], colWidths: number[], bold = false) {
  if (doc.y > 720) {
    doc.addPage();
    doc.y = MARGIN;
  }
  const rowY = doc.y;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
  let x = MARGIN;
  let bottomY = rowY;
  cells.forEach((cell, i) => {
    const w = colWidths[i] ?? 80;
    doc.y = rowY;
    doc.text(cell.replace(/\*\*/g, ''), x, rowY, { width: w - 4 });
    bottomY = Math.max(bottomY, doc.y);
    x += w;
  });
  doc.y = bottomY + 4;
}

function mdToPdf(mdPath: string, outPath: string) {
  const content = fs.readFileSync(mdPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);
  doc.font('Helvetica');

  let inTable = false;
  let tableColWidths: number[] = [];
  const tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '---') {
      inTable = false;
      doc.moveDown(0.5);
      continue;
    }

    if (isTableRow(trimmed)) {
      const cells = parseTableRow(trimmed);
      const isSeparator = cells.every((c) => /^[-:]+$/.test(c));
      if (isSeparator) {
        inTable = true;
        continue;
      }
      if (inTable) {
        tableRows.push(cells);
        continue;
      }
      // First row of new table
      tableRows.length = 0;
      tableRows.push(cells);
      inTable = true;
      continue;
    }

    // Flush table if we were in one
    if (inTable && tableRows.length > 0) {
          const numCols = Math.max(...tableRows.map((r) => r.length));
          const colW = Math.min(120, (CONTENT_WIDTH - 20) / numCols);
          tableColWidths = Array(numCols).fill(colW);
          tableRows.forEach((row, idx) => {
            writeTableRow(doc, row, tableColWidths, idx === 0);
          });
          tableRows.length = 0;
          inTable = false;
          doc.moveDown(0.3);
    }

    if (trimmed === '') {
      doc.moveDown(0.3);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      writeLine(doc, trimmed.slice(2), { fontSize: 20, bold: true });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      writeLine(doc, trimmed.slice(3), { fontSize: 16, bold: true });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      writeLine(doc, trimmed.slice(4), { fontSize: 13, bold: true });
      continue;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      writeLine(doc, trimmed.slice(2), { indent: 8, bullet: true });
      continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      writeLine(doc, trimmed.replace(/^\d+\.\s/, ''), { indent: 8 });
      continue;
    }

    writeLine(doc, trimmed);
  }

  if (inTable && tableRows.length > 0) {
    const numCols = Math.max(...tableRows.map((r) => r.length));
    const colW = Math.min(120, (CONTENT_WIDTH - 20) / numCols);
    tableColWidths = Array(numCols).fill(colW);
    tableRows.forEach((row, idx) => {
      writeTableRow(doc, row, tableColWidths, idx === 0);
    });
  }

  doc.end();

  return new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

const mdFile = process.argv[2] || 'docs/STAKEHOLDER_PRODUCT_OVERVIEW.md';
const resolved = path.resolve(process.cwd(), mdFile);
const outFile = resolved.replace(/\.md$/i, '.pdf');

if (!fs.existsSync(resolved)) {
  console.error('File not found:', resolved);
  process.exit(1);
}

mdToPdf(resolved, outFile)
  .then(() => {
    console.log('PDF created:', outFile);
  })
  .catch((err) => {
    console.error('Error creating PDF:', err);
    process.exit(1);
  });
