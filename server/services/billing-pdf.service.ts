// server/services/billing-pdf.service.ts
import PDFDocument from 'pdfkit';
import { getInvoiceById } from './billing.service';

/**
 * Generate PDF for invoice
 */
export const generateInvoicePDF = async (invoiceId: number): Promise<Buffer> => {
  const invoice = await getInvoiceById(invoiceId);
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Header
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(12);
    doc.text(`Invoice Number: ${invoice.invoiceNumber || invoice.id}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    doc.moveDown();
    
    // Patient details
    if (invoice.patient) {
      doc.text(`Patient: ${invoice.patient.fullName || 'N/A'}`);
      if (invoice.patient.mobileNumber) {
        doc.text(`Mobile: ${invoice.patient.mobileNumber}`);
      }
    }
    doc.moveDown();
    
    // Items table
    doc.text('Items:', { underline: true });
    doc.moveDown(0.5);
    
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item: any) => {
        doc.text(`${item.description} - Qty: ${item.quantity} x ₹${parseFloat(item.unitPrice).toFixed(2)} = ₹${parseFloat(item.amount).toFixed(2)}`);
      });
    }
    doc.moveDown();
    
    // Totals
    doc.text(`Subtotal: ₹${parseFloat(invoice.subtotal || '0').toFixed(2)}`);
    if (parseFloat(invoice.discountAmount || '0') > 0) {
      doc.text(`Discount: -₹${parseFloat(invoice.discountAmount || '0').toFixed(2)}`);
    }
    if (parseFloat(invoice.taxAmount || '0') > 0) {
      doc.text(`Tax: ₹${parseFloat(invoice.taxAmount || '0').toFixed(2)}`);
    }
    doc.fontSize(14).text(`Total: ₹${parseFloat(invoice.total || '0').toFixed(2)}`, { underline: true });
    doc.moveDown();
    
    // Payment info
    if (invoice.payments && invoice.payments.length > 0) {
      doc.text('Payments:', { underline: true });
      invoice.payments.forEach((payment: any) => {
        doc.text(`₹${parseFloat(payment.amount).toFixed(2)} via ${payment.method} on ${new Date(payment.receivedAt).toLocaleDateString()}`);
      });
    }
    
    doc.end();
  });
};
