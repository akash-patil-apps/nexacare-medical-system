/**
 * Generates a professional PDF from the NexaCare AI Features Bible markdown.
 * Usage: npx tsx scripts/generate-ai-roadmap-pdf.ts
 * Output: docs/NexaCare_AI_Features_Bible.pdf
 */
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_W - MARGIN * 2;
const HEADER_H = 40;
const FOOTER_H = 36;
const CONTENT_TOP = 72;
const CONTENT_BOTTOM = PAGE_H - FOOTER_H; // ~806

const PRIMARY = '#0F4C81';
const ACCENT = '#00A8E8';
const LIGHT_BG = '#F0F6FF';
const DARK = '#1C1C2E';
const MID = '#4A5568';
const LIGHT_LINE = '#E2E8F0';

let pageNumber = 0;

function stripBold(text: string): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = [];
  let rest = text.replace(/🔴|🟠|🟡|🟢|⚡/g, ''); // remove emoji for PDF
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

function ensureSpace(
  doc: PDFKit.PDFDocument,
  need: number,
  drawHeader: () => void,
  drawFooter: (n: number) => void
): void {
  if (doc.y + need > CONTENT_BOTTOM) {
    drawFooter(pageNumber);
    doc.addPage({ size: 'A4', margin: 0 });
    pageNumber++;
    drawHeader();
    doc.y = CONTENT_TOP;
  }
}

function drawHeader(doc: PDFKit.PDFDocument): void {
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(PRIMARY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
  doc.text('NexaCare HMS', MARGIN, 14);
  doc.font('Helvetica').fontSize(9);
  doc.text('AI Features Bible — Complete Edition', PAGE_W - MARGIN, 14, { align: 'right', width: 200 });
}

function drawFooter(doc: PDFKit.PDFDocument, num: number): void {
  doc.rect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H).fill(LIGHT_LINE);
  doc.fillColor(MID).font('Helvetica').fontSize(8);
  doc.text('Confidential — NexaCare Internal Document', MARGIN, PAGE_H - 22);
  doc.text(`Page ${num}`, PAGE_W - MARGIN, PAGE_H - 22, { align: 'right' });
}

function writePara(
  doc: PDFKit.PDFDocument,
  line: string,
  opts: { fontSize?: number; indent?: number; bullet?: boolean; spacing?: number } = {},
  drawHeader: () => void,
  drawFooter: (n: number) => void
): void {
  const fontSize = opts.fontSize ?? 9;
  const indent = opts.indent ?? 0;
  const bullet = opts.bullet ?? false;
  const spacing = opts.spacing ?? 0.35;
  const maxW = CONTENT_WIDTH - indent - (bullet ? 14 : 0);
  const startX = MARGIN + indent + (bullet ? 14 : 0);

  ensureSpace(doc, fontSize * 2.5 + 8, drawHeader, drawFooter);

  if (bullet) {
    doc.fillColor(DARK).fontSize(fontSize).font('Helvetica');
    doc.text('• ', MARGIN, doc.y);
  }
  const chunks = stripBold(line);
  doc.fontSize(fontSize);
  chunks.forEach((part, idx) => {
    doc.font(part.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(DARK);
    doc.text(part.text, startX, doc.y, { width: maxW, continued: idx < chunks.length - 1 });
  });
  doc.moveDown(spacing);
}

function writeTitle(
  doc: PDFKit.PDFDocument,
  text: string,
  level: 1 | 2 | 3,
  drawHeader: () => void,
  drawFooter: (n: number) => void
): void {
  const sizes = { 1: 16, 2: 13, 3: 11 };
  const colors = { 1: PRIMARY, 2: PRIMARY, 3: ACCENT };
  const before = level === 1 ? 0.2 : level === 2 ? 0.15 : 0.1;
  ensureSpace(doc, 40, drawHeader, drawFooter);
  if (doc.y > CONTENT_TOP + 20) doc.moveDown(before);
  doc.fontSize(sizes[level]).font('Helvetica-Bold').fillColor(colors[level]);
  doc.text(text, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.25);
  if (level === 1 || level === 2) {
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + 80, doc.y).strokeColor(ACCENT).lineWidth(1).stroke();
    doc.moveDown(0.15);
  }
  doc.moveDown(0.2);
}

function writeBlockquote(
  doc: PDFKit.PDFDocument,
  text: string,
  drawHeader: () => void,
  drawFooter: (n: number) => void
): void {
  ensureSpace(doc, 28, drawHeader, drawFooter);
  const y0 = doc.y;
  doc.rect(MARGIN, y0 - 2, 4, 20).fill(ACCENT);
  doc.fillColor(MID).fontSize(9).font('Helvetica');
  doc.text(text.replace(/^>\s*/, '').replace(/\*\*/g, ''), MARGIN + 12, y0, { width: CONTENT_WIDTH - 12 });
  doc.y = y0 + 18;
  doc.moveDown(0.25);
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

function writeTable(
  doc: PDFKit.PDFDocument,
  rows: string[][],
  drawHeader: () => void,
  drawFooter: (n: number) => void
): void {
  if (rows.length === 0) return;
  const numCols = Math.max(...rows.map((r) => r.length));
  const colW = (CONTENT_WIDTH - 4) / numCols;
  const rowH = 14;
  const totalH = rows.length * rowH + 8;
  ensureSpace(doc, totalH, drawHeader, drawFooter);

  rows.forEach((cells, idx) => {
    ensureSpace(doc, rowH + 4, drawHeader, drawFooter);
    const rowY = doc.y;
    const isHeader = idx === 0;
    if (isHeader) {
      doc.rect(MARGIN, rowY - 2, CONTENT_WIDTH, rowH + 4).fill(PRIMARY);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
    } else {
      doc.fillColor(idx % 2 === 0 ? '#FFFFFF' : LIGHT_BG).rect(MARGIN, rowY - 2, CONTENT_WIDTH, rowH + 2).fill();
      doc.fillColor(DARK).font('Helvetica').fontSize(7.5);
    }
    let x = MARGIN + 4;
    cells.forEach((cell, ci) => {
      const w = colW - 4;
      doc.text(cell.replace(/\*\*/g, ''), x, rowY, { width: w });
      x += colW;
    });
    doc.y = rowY + rowH + 2;
  });
  doc.moveDown(0.2);
}

function buildPdf(mdPath: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const content = fs.readFileSync(mdPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    const drawHeaderFn = () => drawHeader(doc);
    const drawFooterFn = (n: number) => drawFooter(doc, n);

    // —— Cover page ——
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(PRIMARY);
    doc.fillColor('#FFFFFF').font('Helvetica').fontSize(12);
    doc.text('NexaCare HMS', MARGIN, 80);
    doc.font('Helvetica-Bold').fontSize(26);
    doc.text('Complete AI Features Bible', MARGIN, 105);
    doc.font('Helvetica').fontSize(14);
    doc.text('Every Possible AI Feature for a World-Class Healthcare Management Platform', MARGIN, 145, {
      width: CONTENT_WIDTH,
    });
    doc.fontSize(10).fillColor('#BFD7ED');
    doc.text('Version 3.0 — Unconstrained Edition', MARGIN, 200);
    doc.text('No tech stack limitations. Think big, build the best HMS in the world.', MARGIN, 218);
    doc.text('75+ AI Features  •  Every role, every workflow, every patient touchpoint', MARGIN, 236);
    doc.fillColor('#FFFFFF').fontSize(11);
    doc.text(
      'A comprehensive blueprint for embedding Artificial Intelligence into every layer of your Healthcare Management Platform.',
      MARGIN,
      280,
      { width: CONTENT_WIDTH, align: 'center' }
    );
    doc.moveDown(2);
    doc.font('Helvetica').fontSize(9).fillColor('#90B4CE');
    doc.text(`Generated from NexaCare_AI_Roadmap_Content.md`, MARGIN, 380);
    doc.text(`NexaCare Product & Engineering Team`, MARGIN, 395);

    doc.addPage({ size: 'A4', margin: 0 });
    pageNumber = 1;
    drawHeaderFn();
    doc.y = CONTENT_TOP;

    let tableRows: string[][] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const t = line.trim();

      if (t === '---') {
        if (tableRows.length > 0) {
          writeTable(doc, tableRows, drawHeaderFn, drawFooterFn);
          tableRows = [];
        }
        doc.moveDown(0.3);
        i++;
        continue;
      }

      if (isTableRow(t)) {
        const cells = parseTableRow(t);
        const isSep = cells.every((c) => /^[-:]+$/.test(c));
        if (isSep) {
          i++;
          continue;
        }
        tableRows.push(cells);
        i++;
        continue;
      }

      if (tableRows.length > 0) {
        writeTable(doc, tableRows, drawHeaderFn, drawFooterFn);
        tableRows = [];
      }

      if (t === '') {
        doc.moveDown(0.25);
        i++;
        continue;
      }

      if (t.startsWith('# ')) {
        writeTitle(doc, t.slice(2), 1, drawHeaderFn, drawFooterFn);
        i++;
        continue;
      }
      if (t.startsWith('## ')) {
        writeTitle(doc, t.slice(3), 2, drawHeaderFn, drawFooterFn);
        i++;
        continue;
      }
      if (t.startsWith('### ')) {
        writeTitle(doc, t.slice(4), 3, drawHeaderFn, drawFooterFn);
        i++;
        continue;
      }
      if (t.startsWith('> ')) {
        const block: string[] = [t];
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('> ')) {
          i++;
          block.push(lines[i].trim());
        }
        writeBlockquote(doc, block.join(' ').replace(/>\s*/g, ' '), drawHeaderFn, drawFooterFn);
        i++;
        continue;
      }
      if (t.startsWith('- ') || t.startsWith('* ')) {
        writePara(doc, t.slice(2), { indent: 8, bullet: true }, drawHeaderFn, drawFooterFn);
        i++;
        continue;
      }
      if (t.startsWith('- [ ]') || t.startsWith('- [x]')) {
        writePara(doc, t.replace(/^- \[[ x]\]\s*/, '□ '), { indent: 8, bullet: true }, drawHeaderFn, drawFooterFn);
        i++;
        continue;
      }
      if (/^\d+\.\s/.test(t)) {
        writePara(doc, t.replace(/^\d+\.\s/, ''), { indent: 6 }, drawHeaderFn, drawFooterFn);
        i++;
        continue;
      }
      if (t.startsWith('```')) {
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) i++;
        i++;
        continue;
      }

      writePara(doc, t, {}, drawHeaderFn, drawFooterFn);
      i++;
    }

    if (tableRows.length > 0) {
      writeTable(doc, tableRows, drawHeaderFn, drawFooterFn);
    }

    drawFooterFn(pageNumber);
    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

const mdPath = path.resolve(process.cwd(), 'docs/NexaCare_AI_Roadmap_Content.md');
const outPath = path.resolve(process.cwd(), 'docs/NexaCare_AI_Features_Bible.pdf');

if (!fs.existsSync(mdPath)) {
  console.error('Input file not found:', mdPath);
  process.exit(1);
}

buildPdf(mdPath, outPath)
  .then(() => {
    console.log('PDF created:', outPath);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
