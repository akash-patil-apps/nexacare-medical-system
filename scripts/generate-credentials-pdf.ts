/**
 * Generate a clean credentials PDF grouped by hospital.
 * Usage: npx tsx scripts/generate-credentials-pdf.ts
 */
import { db } from '../server/db';
import { users, hospitals, doctors, patients, receptionists, labs, nurses, pharmacists, radiologyTechnicians } from '../shared/schema';
import { eq } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const UNIVERSAL_PASSWORD = 'password123';
const MARGIN = 40;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

interface UserRecord {
  id: number;
  mobileNumber: string;
  fullName: string;
  email: string;
  role: string;
}

async function generate() {
  console.log('Fetching data from database...');

  const allUsers = await db.select().from(users);
  const allHospitals = await db.select().from(hospitals);
  const allDoctors = await db.select().from(doctors);
  const allPatients = await db.select().from(patients);
  const allReceptionists = await db.select().from(receptionists);
  const allLabs = await db.select().from(labs);

  // Try to fetch nurses, pharmacists, radiology technicians (may not exist)
  let allNurses: any[] = [];
  let allPharmacists: any[] = [];
  let allRadTechs: any[] = [];
  try { allNurses = await db.select().from(nurses); } catch {}
  try { allPharmacists = await db.select().from(pharmacists); } catch {}
  try { allRadTechs = await db.select().from(radiologyTechnicians); } catch {}

  console.log(`Found ${allUsers.length} users, ${allHospitals.length} hospitals`);

  // Build hospital map: hospitalId -> { hospital, doctors, receptionists, nurses, pharmacists, radTechs }
  const hospitalMap = new Map<number, {
    hospital: typeof allHospitals[0];
    admin: UserRecord | null;
    doctors: { user: UserRecord; specialty: string }[];
    receptionists: { user: UserRecord; shift: string }[];
    nurses: { user: UserRecord; specialization: string }[];
    pharmacists: { user: UserRecord; licenseNumber: string }[];
    radTechs: { user: UserRecord; certification: string }[];
  }>();

  for (const h of allHospitals) {
    const adminUser = allUsers.find(u => u.id === h.userId);
    hospitalMap.set(h.id, {
      hospital: h,
      admin: adminUser ? { id: adminUser.id, mobileNumber: adminUser.mobileNumber, fullName: adminUser.fullName, email: adminUser.email, role: adminUser.role } : null,
      doctors: [],
      receptionists: [],
      nurses: [],
      pharmacists: [],
      radTechs: [],
    });
  }

  // Assign doctors
  for (const d of allDoctors) {
    const u = allUsers.find(usr => usr.id === d.userId);
    if (u && d.hospitalId && hospitalMap.has(d.hospitalId)) {
      hospitalMap.get(d.hospitalId)!.doctors.push({ user: { id: u.id, mobileNumber: u.mobileNumber, fullName: u.fullName, email: u.email, role: u.role }, specialty: d.specialty });
    }
  }

  // Assign receptionists
  for (const r of allReceptionists) {
    const u = allUsers.find(usr => usr.id === r.userId);
    if (u && r.hospitalId && hospitalMap.has(r.hospitalId)) {
      hospitalMap.get(r.hospitalId)!.receptionists.push({ user: { id: u.id, mobileNumber: u.mobileNumber, fullName: u.fullName, email: u.email, role: u.role }, shift: (r as any).shift || 'N/A' });
    }
  }

  // Assign nurses
  for (const n of allNurses) {
    const u = allUsers.find(usr => usr.id === n.userId);
    if (u && n.hospitalId && hospitalMap.has(n.hospitalId)) {
      hospitalMap.get(n.hospitalId)!.nurses.push({ user: { id: u.id, mobileNumber: u.mobileNumber, fullName: u.fullName, email: u.email, role: u.role }, specialization: n.specialization || 'General' });
    }
  }

  // Assign pharmacists
  for (const p of allPharmacists) {
    const u = allUsers.find(usr => usr.id === p.userId);
    if (u && p.hospitalId && hospitalMap.has(p.hospitalId)) {
      hospitalMap.get(p.hospitalId)!.pharmacists.push({ user: { id: u.id, mobileNumber: u.mobileNumber, fullName: u.fullName, email: u.email, role: u.role }, licenseNumber: p.licenseNumber || 'N/A' });
    }
  }

  // Assign radiology technicians
  for (const rt of allRadTechs) {
    const u = allUsers.find(usr => usr.id === rt.userId);
    if (u && rt.hospitalId && hospitalMap.has(rt.hospitalId)) {
      hospitalMap.get(rt.hospitalId)!.radTechs.push({ user: { id: u.id, mobileNumber: u.mobileNumber, fullName: u.fullName, email: u.email, role: u.role }, certification: rt.certification || 'N/A' });
    }
  }

  // Collect patients and labs (not hospital-specific)
  const patientUsers = allUsers.filter(u => u.role === 'PATIENT');
  const labEntries = allLabs.map(l => {
    const u = allUsers.find(usr => usr.id === l.userId);
    return { user: u, lab: l };
  }).filter(e => e.user);

  const adminUsers = allUsers.filter(u => u.role === 'ADMIN');

  // ── Generate PDF ──────────────────────────────────────────────────────
  const outPath = path.resolve('docs/USER_CREDENTIALS.pdf');
  const doc = new PDFDocument({ size: 'A4', margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  let y = MARGIN;

  function checkPage(needed: number) {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function title(text: string, size = 20) {
    checkPage(40);
    doc.font('Helvetica-Bold').fontSize(size).fillColor('#111827').text(text, MARGIN, y, { width: CONTENT_WIDTH });
    y = (doc as any).y + 10;
  }

  function subtitle(text: string) {
    checkPage(30);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#10B981').text(text, MARGIN, y, { width: CONTENT_WIDTH });
    y = (doc as any).y + 6;
  }

  function sectionLabel(text: string) {
    checkPage(24);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#374151').text(text, MARGIN, y, { width: CONTENT_WIDTH });
    y = (doc as any).y + 4;
  }

  function bodyText(text: string) {
    checkPage(18);
    doc.font('Helvetica').fontSize(10).fillColor('#374151').text(text, MARGIN, y, { width: CONTENT_WIDTH });
    y = (doc as any).y + 2;
  }

  function separator() {
    checkPage(12);
    y += 4;
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor('#D1D5DB').lineWidth(0.5).stroke();
    y += 8;
  }

  function tableHeader(cols: string[], colWidths: number[]) {
    checkPage(22);
    let x = MARGIN;
    // Header background
    doc.rect(MARGIN, y, CONTENT_WIDTH, 18).fill('#F3F4F6');
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8);
    for (let i = 0; i < cols.length; i++) {
      doc.text(cols[i], x + 4, y + 4, { width: colWidths[i] - 8 });
      x += colWidths[i];
    }
    y += 18;
  }

  function tableRow(cells: string[], colWidths: number[], rowIdx: number) {
    checkPage(20);
    let x = MARGIN;
    if (rowIdx % 2 === 0) {
      doc.rect(MARGIN, y, CONTENT_WIDTH, 16).fill('#FAFAFA');
    }
    doc.fillColor('#374151').font('Helvetica').fontSize(8);
    for (let i = 0; i < cells.length; i++) {
      doc.text(cells[i], x + 4, y + 3, { width: colWidths[i] - 8 });
      x += colWidths[i];
    }
    y += 16;
  }

  // ── Cover Page ────────────────────────────────────────────────────────
  y = 120;
  doc.font('Helvetica-Bold').fontSize(28).fillColor('#10B981').text('NexaCare HMS', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
  y = (doc as any).y + 8;
  doc.font('Helvetica').fontSize(14).fillColor('#6B7280').text('Healthcare Management System', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
  y = (doc as any).y + 40;
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827').text('User Credentials', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
  y = (doc as any).y + 6;
  doc.font('Helvetica').fontSize(12).fillColor('#6B7280').text('Hospital-wise Test Account Directory', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
  y = (doc as any).y + 50;

  // Summary box
  doc.rect(MARGIN + 80, y, CONTENT_WIDTH - 160, 140).lineWidth(1).strokeColor('#10B981').stroke();
  y += 16;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Quick Reference', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 22;
  doc.font('Helvetica').fontSize(11).fillColor('#374151');
  doc.text(`Total Users: ${allUsers.length}`, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' }); y += 16;
  doc.text(`Hospitals: ${allHospitals.length}`, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' }); y += 16;
  doc.text(`Doctors: ${allDoctors.length}  |  Patients: ${patientUsers.length}  |  Labs: ${allLabs.length}`, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' }); y += 16;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#10B981');
  doc.text(`Password for ALL accounts: ${UNIVERSAL_PASSWORD}`, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' }); y += 16;
  doc.font('Helvetica').fontSize(10).fillColor('#6B7280');
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });

  // ── Admin Page ────────────────────────────────────────────────────────
  doc.addPage();
  y = MARGIN;
  title('ADMIN USERS');
  const adminCols = ['#', 'Mobile Number', 'Name', 'Password'];
  const adminWidths = [30, 120, 200, 165];
  tableHeader(adminCols, adminWidths);
  adminUsers.forEach((u, i) => {
    tableRow([String(i + 1), u.mobileNumber, u.fullName, UNIVERSAL_PASSWORD], adminWidths, i);
  });

  y += 10;
  separator();

  // ── Hospital-wise sections ────────────────────────────────────────────
  const sortedHospitals = [...hospitalMap.values()].sort((a, b) => a.hospital.name.localeCompare(b.hospital.name));

  for (const entry of sortedHospitals) {
    const h = entry.hospital;
    const staffCount = entry.doctors.length + entry.receptionists.length + entry.nurses.length + entry.pharmacists.length + entry.radTechs.length;

    checkPage(80);
    title(`${h.name}`, 16);
    bodyText(`City: ${h.city || 'N/A'}  |  Total Staff: ${staffCount}`);
    y += 4;

    // Hospital Admin
    if (entry.admin) {
      sectionLabel('Hospital Admin');
      const haCols = ['Mobile Number', 'Name', 'Password'];
      const haWidths = [150, 220, 145];
      tableHeader(haCols, haWidths);
      tableRow([entry.admin.mobileNumber, entry.admin.fullName, UNIVERSAL_PASSWORD], haWidths, 0);
      y += 6;
    }

    // Doctors
    if (entry.doctors.length > 0) {
      sectionLabel(`Doctors (${entry.doctors.length})`);
      const dCols = ['#', 'Mobile Number', 'Name', 'Specialty', 'Password'];
      const dWidths = [25, 100, 140, 120, 130];
      tableHeader(dCols, dWidths);
      entry.doctors.forEach((d, i) => {
        tableRow([String(i + 1), d.user.mobileNumber, d.user.fullName, d.specialty, UNIVERSAL_PASSWORD], dWidths, i);
      });
      y += 6;
    }

    // Receptionists
    if (entry.receptionists.length > 0) {
      sectionLabel(`Receptionists (${entry.receptionists.length})`);
      const rCols = ['#', 'Mobile Number', 'Name', 'Shift', 'Password'];
      const rWidths = [25, 120, 170, 80, 120];
      tableHeader(rCols, rWidths);
      entry.receptionists.forEach((r, i) => {
        tableRow([String(i + 1), r.user.mobileNumber, r.user.fullName, r.shift, UNIVERSAL_PASSWORD], rWidths, i);
      });
      y += 6;
    }

    // Nurses
    if (entry.nurses.length > 0) {
      sectionLabel(`Nurses (${entry.nurses.length})`);
      const nCols = ['#', 'Mobile Number', 'Name', 'Specialization', 'Password'];
      const nWidths = [25, 120, 160, 100, 110];
      tableHeader(nCols, nWidths);
      entry.nurses.forEach((n, i) => {
        tableRow([String(i + 1), n.user.mobileNumber, n.user.fullName, n.specialization, UNIVERSAL_PASSWORD], nWidths, i);
      });
      y += 6;
    }

    // Pharmacists
    if (entry.pharmacists.length > 0) {
      sectionLabel(`Pharmacists (${entry.pharmacists.length})`);
      const pCols = ['#', 'Mobile Number', 'Name', 'Password'];
      const pWidths = [25, 140, 200, 150];
      tableHeader(pCols, pWidths);
      entry.pharmacists.forEach((p, i) => {
        tableRow([String(i + 1), p.user.mobileNumber, p.user.fullName, UNIVERSAL_PASSWORD], pWidths, i);
      });
      y += 6;
    }

    // Radiology Technicians
    if (entry.radTechs.length > 0) {
      sectionLabel(`Radiology Technicians (${entry.radTechs.length})`);
      const rtCols = ['#', 'Mobile Number', 'Name', 'Password'];
      const rtWidths = [25, 140, 200, 150];
      tableHeader(rtCols, rtWidths);
      entry.radTechs.forEach((rt, i) => {
        tableRow([String(i + 1), rt.user.mobileNumber, rt.user.fullName, UNIVERSAL_PASSWORD], rtWidths, i);
      });
      y += 6;
    }

    separator();
  }

  // ── Patients Section ──────────────────────────────────────────────────
  doc.addPage();
  y = MARGIN;
  title('PATIENT USERS');
  bodyText(`Total: ${patientUsers.length} patients  |  Password: ${UNIVERSAL_PASSWORD}`);
  y += 6;

  const pCols = ['#', 'Mobile Number', 'Name', 'Password'];
  const pWidths = [30, 140, 210, 135];
  tableHeader(pCols, pWidths);
  patientUsers.forEach((u, i) => {
    tableRow([String(i + 1), u.mobileNumber, u.fullName, UNIVERSAL_PASSWORD], pWidths, i);
  });

  // ── Labs Section ──────────────────────────────────────────────────────
  checkPage(80);
  y += 10;
  separator();
  title('LAB USERS');
  bodyText(`Total: ${labEntries.length} labs  |  Password: ${UNIVERSAL_PASSWORD}`);
  y += 6;

  const lCols = ['#', 'Mobile Number', 'Admin Name', 'Lab Name', 'City', 'Password'];
  const lWidths = [25, 100, 110, 110, 60, 110];
  tableHeader(lCols, lWidths);
  labEntries.forEach((e, i) => {
    tableRow([String(i + 1), e.user!.mobileNumber, e.user!.fullName, e.lab.name, e.lab.city || 'N/A', UNIVERSAL_PASSWORD], lWidths, i);
  });

  // ── Finalize ──────────────────────────────────────────────────────────
  doc.end();
  await new Promise<void>((resolve) => stream.on('finish', resolve));
  console.log(`\nPDF generated: ${outPath}`);
}

generate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
