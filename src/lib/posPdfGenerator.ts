import { PosBill, Business } from '@/types';

/**
 * Generates and downloads a clean, professional PDF bill receipt.
 * Optimized for standard on-screen viewing and PDF archival.
 * (No physical printer dialogs triggered).
 */
export async function downloadPosBillPdf(bill: PosBill, business?: Business | null) {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // 1. Business Header
  const bizName = business?.name || 'ORDERONE STORE';
  const bizPhone = business?.phone || '';
  const bizAddress = business?.address || '';
  const gstin = business?.settings?.orderSettings?.gstin || business?.settings?.gst?.gstin || '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(bizName, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  if (bizAddress) {
    doc.text(bizAddress, pageWidth / 2, y, { align: 'center' });
    y += 4.5;
  }
  const contactParts: string[] = [];
  if (bizPhone) contactParts.push(`Tel: ${bizPhone}`);
  if (gstin) contactParts.push(`GSTIN: ${gstin}`);
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  |  '), pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  // Divider
  y += 2;
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // 2. Receipt Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('COUNTER BILL / RECEIPT', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(bill.billNumber, pageWidth - margin, y, { align: 'right' });
  y += 6;

  // Metadata Grid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const billDate = new Date(bill.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.text(`Date & Time: ${billDate}`, margin, y);
  doc.text(`Payment: ${bill.paymentMethod.toUpperCase()} (${bill.paymentStatus.toUpperCase()})`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  const customerDisplay = bill.customerName
    ? `${bill.customerName}${bill.customerPhone ? ` (${bill.customerPhone})` : ''}`
    : 'Walk-in Customer';
  doc.text(`Customer: ${customerDisplay}`, margin, y);
  if (bill.createdBy) {
    doc.text(`Billed By: ${bill.createdBy}`, pageWidth - margin, y, { align: 'right' });
  }
  y += 8;

  // 3. Line Items Table Header
  const colX = {
    sr: margin + 2,
    item: margin + 12,
    rate: margin + 105,
    qty: margin + 135,
    total: pageWidth - margin - 2,
  };

  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(margin, y - 4, contentWidth, 8, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y - 4, contentWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('#', colX.sr, y + 1.5);
  doc.text('ITEM DESCRIPTION', colX.item, y + 1.5);
  doc.text('RATE', colX.rate, y + 1.5, { align: 'right' });
  doc.text('QTY', colX.qty, y + 1.5, { align: 'center' });
  doc.text('AMOUNT', colX.total, y + 1.5, { align: 'right' });
  y += 9;

  // 4. Line Items Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  bill.items.forEach((item, idx) => {
    // Check if new page needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.text(String(idx + 1), colX.sr, y);
    // Truncate long item names
    const truncatedName = doc.splitTextToSize(item.productName, 85);
    doc.text(truncatedName[0], colX.item, y);
    doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, colX.rate, y, { align: 'right' });
    doc.text(String(item.quantity), colX.qty, y, { align: 'center' });
    doc.text(`₹${Number(item.totalPrice).toFixed(2)}`, colX.total, y, { align: 'right' });

    y += 4;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  });

  y += 2;

  // 5. Totals & Calculations Box
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  const totalsBoxWidth = 85;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', totalsBoxX, y);
  doc.setTextColor(15, 23, 42);
  doc.text(`₹${Number(bill.subtotal).toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
  y += 5.5;

  // Discount (if any)
  if (bill.discountAmount > 0) {
    const discountLabel = bill.discountType === 'percentage'
      ? `Discount (${bill.discountRate}%):`
      : 'Discount:';
    doc.setTextColor(16, 185, 129); // Emerald-600
    doc.text(discountLabel, totalsBoxX, y);
    doc.text(`- ₹${Number(bill.discountAmount).toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
    y += 5.5;
  }

  // Tax (if any)
  if (bill.taxAmount > 0) {
    const taxLabel = bill.taxRate > 0 ? `Tax / GST (${bill.taxRate}%):` : 'Tax / GST:';
    doc.setTextColor(100, 116, 139);
    doc.text(taxLabel, totalsBoxX, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`+ ₹${Number(bill.taxAmount).toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
    y += 5.5;
  }

  // Grand Total Line
  y += 1;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.6);
  doc.line(totalsBoxX, y, pageWidth - margin, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('GRAND TOTAL:', totalsBoxX, y);
  doc.setTextColor(79, 70, 229);
  doc.text(`₹${Number(bill.totalAmount).toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
  y += 10;

  // Optional Notes
  if (bill.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Note: ${bill.notes}`, margin, y);
    y += 8;
  }

  // 6. Footer
  y = Math.max(y + 6, 268);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your visit! Please visit again.', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Digital Counter Receipt ?" OrderOne.in', pageWidth / 2, y, { align: 'center' });

  // Save PDF
  const filename = `${bill.billNumber}_${new Date(bill.createdAt).toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
