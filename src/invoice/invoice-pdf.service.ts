import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { Invoice } from '../database/schemas/invoice.schema';
import { NOT_FOUND_ERRORS } from './constants/invoice-messages';

/**
 * Invoice PDF Export Service
 * Generates printable A4 PDF for a given invoice.
 *
 * UC-7y8z9a0b: Print/Export Invoice
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
@Injectable()
export class InvoicePdfService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
  ) {}

  /**
   * Generate a PDF buffer for a single invoice.
   * Returns raw bytes ready to be streamed as application/pdf.
   */
  async generateInvoicePdf(invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.invoiceModel
      .findById(invoiceId)
      .populate([
        { path: 'patientId', select: 'firstName lastName patientNumber' },
        { path: 'clinicId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName' },
      ])
      .exec();

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException(NOT_FOUND_ERRORS.INVOICE);
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    this.drawContent(page, font, fontBold, invoice);

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    const filename = `${invoice.invoiceNumber}.pdf`;

    return { buffer, filename };
  }

  // ─── Drawing helpers ────────────────────────────────────────────────────────

  private drawContent(page: PDFPage, font: PDFFont, fontBold: PDFFont, invoice: any): void {
    const { width, height } = page.getSize();
    const margin = 50;
    const contentWidth = width - margin * 2;
    let y = height - margin;

    // ── Header ──────────────────────────────────────────────────────────────
    page.drawText('INVOICE', {
      x: margin,
      y: y - 10,
      size: 22,
      font: fontBold,
      color: rgb(0.13, 0.43, 0.73),
    });

    // Invoice number (right-aligned)
    const numText = invoice.invoiceNumber;
    const numWidth = fontBold.widthOfTextAtSize(numText, 14);
    page.drawText(numText, {
      x: width - margin - numWidth,
      y: y - 10,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    y -= 40;

    // Divider
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.13, 0.43, 0.73),
    });

    y -= 20;

    // ── Meta row: Date / Status ──────────────────────────────────────────────
    const issueDate = invoice.issueDate
      ? new Date(invoice.issueDate).toLocaleDateString('en-GB')
      : '-';

    page.drawText(`Issue Date: ${issueDate}`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const statusLabel = `Status: ${invoice.paymentStatus?.replace(/_/g, ' ').toUpperCase()}`;
    const statusWidth = font.widthOfTextAtSize(statusLabel, 10);
    page.drawText(statusLabel, {
      x: width - margin - statusWidth,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    y -= 30;

    // ── Patient / Clinic Info ────────────────────────────────────────────────
    const patient = (invoice.patientId as any) || {};
    const clinic = (invoice.clinicId as any) || {};
    const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || '-';
    const patientNum = patient.patientNumber || '-';
    const clinicName = clinic.name || '-';

    y = this.drawSectionHeader(page, fontBold, margin, y, 'Patient Details');
    y = this.drawLabelValue(page, font, margin, contentWidth, y, 'Patient Name', patientName);
    y = this.drawLabelValue(page, font, margin, contentWidth, y, 'Patient Number', patientNum);
    y = this.drawLabelValue(page, font, margin, contentWidth, y, 'Clinic', clinicName);

    y -= 10;

    // ── Invoice Title ────────────────────────────────────────────────────────
    y = this.drawSectionHeader(page, fontBold, margin, y, 'Invoice Details');
    y = this.drawLabelValue(page, font, margin, contentWidth, y, 'Title', invoice.invoiceTitle || '-');
    if (invoice.extraInfo) {
      y = this.drawLabelValue(page, font, margin, contentWidth, y, 'Extra Info', invoice.extraInfo);
    }

    y -= 10;

    // ── Services Table ───────────────────────────────────────────────────────
    y = this.drawSectionHeader(page, fontBold, margin, y, 'Services & Sessions');

    // Table header row
    const colX = [margin, margin + 200, margin + 300, margin + 390, margin + 460];
    const colHeaders = ['Session', 'Status', 'Unit Price', 'Discount', 'Total'];
    colHeaders.forEach((h, i) => {
      page.drawText(h, {
        x: colX[i],
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.13, 0.43, 0.73),
      });
    });
    y -= 5;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 12;

    for (const svc of (invoice.services || [])) {
      // Service name row
      page.drawText(`Service: ${svc.serviceName || '-'}`, {
        x: margin,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 14;

      for (const sess of (svc.sessions || [])) {
        // Truncate long session names
        const sessName = (sess.sessionName || '-').substring(0, 35);
        const status = (sess.sessionStatus || '').replace(/_/g, ' ');
        page.drawText(sessName, { x: colX[0], y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(status, { x: colX[1], y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(this.fmt(sess.unitPrice), { x: colX[2], y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(`${sess.discountPercent || 0}%`, { x: colX[3], y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(this.fmt(sess.lineTotal), { x: colX[4], y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 13;

        if (y < 120) break; // safety: don't overflow page
      }
      if (y < 120) break;
    }

    y -= 10;

    // ── Financial Summary ────────────────────────────────────────────────────
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 14;

    const summaryX = width - margin - 200;
    y = this.drawSummaryRow(page, font, fontBold, summaryX, y, 'Subtotal', this.fmt(invoice.subtotal));
    if (invoice.discountAmount > 0) {
      y = this.drawSummaryRow(page, font, fontBold, summaryX, y, 'Discount', `-${this.fmt(invoice.discountAmount)}`);
    }
    if (invoice.taxAmount > 0) {
      y = this.drawSummaryRow(page, font, fontBold, summaryX, y, 'Tax', this.fmt(invoice.taxAmount));
    }
    y = this.drawSummaryRow(page, font, fontBold, summaryX, y, 'Total', this.fmt(invoice.totalAmount), true);
    y = this.drawSummaryRow(page, font, fontBold, summaryX, y, 'Paid', this.fmt(invoice.paidAmount));
    const balance = Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));
    y = this.drawSummaryRow(page, font, fontBold, summaryX, y, 'Balance Due', this.fmt(balance), balance > 0);

    y -= 20;

    // ── Notes ────────────────────────────────────────────────────────────────
    if (invoice.notes && y > 100) {
      page.drawText('Notes:', {
        x: margin,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 14;
      // Wrap notes at 80 chars
      const noteLines = this.wrapText(invoice.notes, 90);
      for (const line of noteLines) {
        if (y < 80) break;
        page.drawText(line, { x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
        y -= 12;
      }
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const { height: h } = page.getSize();
    page.drawLine({
      start: { x: margin, y: 50 },
      end: { x: width - margin, y: 50 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawText('Generated by Cliniva', {
      x: margin,
      y: 35,
      size: 8,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
    const printDate = new Date().toLocaleDateString('en-GB');
    const printText = `Printed: ${printDate}`;
    const printWidth = font.widthOfTextAtSize(printText, 8);
    page.drawText(printText, {
      x: width - margin - printWidth,
      y: 35,
      size: 8,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  private drawSectionHeader(page: PDFPage, fontBold: PDFFont, x: number, y: number, title: string): number {
    page.drawText(title, {
      x,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.13, 0.43, 0.73),
    });
    return y - 16;
  }

  private drawLabelValue(
    page: PDFPage,
    font: PDFFont,
    x: number,
    contentWidth: number,
    y: number,
    label: string,
    value: string,
  ): number {
    const labelWidth = 110;
    page.drawText(`${label}:`, {
      x,
      y,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(value, {
      x: x + labelWidth,
      y,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    return y - 14;
  }

  private drawSummaryRow(
    page: PDFPage,
    font: PDFFont,
    fontBold: PDFFont,
    x: number,
    y: number,
    label: string,
    value: string,
    highlight = false,
  ): number {
    const f = highlight ? fontBold : font;
    const color = highlight ? rgb(0.13, 0.43, 0.73) : rgb(0.3, 0.3, 0.3);
    page.drawText(`${label}:`, { x, y, size: 9, font: f, color });
    const valWidth = f.widthOfTextAtSize(value, 9);
    page.drawText(value, { x: x + 130 - valWidth, y, size: 9, font: f, color });
    return y - 14;
  }

  private fmt(n: number | undefined | null): string {
    if (n == null) return '0.00';
    return Number(n).toFixed(2);
  }

  private wrapText(text: string, maxLen: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxLen) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = (current + ' ' + word).trim();
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
