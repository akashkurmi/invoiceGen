import jsPDF from "jspdf";

export interface RentalRecordForPDF {
  id?: number;
  memberName: string;
  phone?: string;
  outfit: string;
  rentDate: string;
  returnDate: string;
  price: number;
  advance: number;
}

export interface ServiceItemForPDF {
  name: string;
  price: number | string;
  qty?: string | number;
  date?: string;
}

export interface MakeupRecordForPDF {
  id?: number;
  clientName: string;
  bookingDate: string;
  advance: number;
  totalPrice: number;
  venue?: string;
  phone?: string;
  email?: string;
  services?: string | ServiceItemForPDF[];
  noOfServices?: number;
  travelAmount?: number;
}

const fmtDate = (d: string): string => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

/**
 * Generates and downloads a branded PDF invoice for Gayatri Collection rentals.
 */
export function generateRentalPDF(record: RentalRecordForPDF): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;
  const marginL = 20;
  const marginR = 20;
  const black: [number, number, number] = [0, 0, 0];
  const gold: [number, number, number] = [162, 112, 34];
  const linkBlue: [number, number, number] = [34, 85, 204];

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  // ── TITLE ──────────────────────────────────────────────
  const titleY = 22;

  // "The"
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(...gold);
  doc.text("The", pageW / 2, titleY, { align: "center" });

  // "Gayatri Collection"
  const mainY = titleY + 12;

  doc.setFont("times", "bolditalic");
  doc.setFontSize(36);
  doc.setTextColor(...gold);
  const gayatriW = doc.getTextWidth("Gayatri");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...black);
  const collectionW = doc.getTextWidth(" Collection");

  const combinedW = gayatriW + collectionW;
  const startX = (pageW - combinedW) / 2;

  doc.setFont("times", "bolditalic");
  doc.setFontSize(36);
  doc.setTextColor(...gold);
  doc.text("Gayatri", startX, mainY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...black);
  doc.text(" Collection", startX + gayatriW, mainY);

  // Ornamental rule
  const ruleY = mainY + 6;
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.line(marginL, ruleY, pageW / 2 - 4, ruleY);
  doc.line(pageW / 2 + 4, ruleY, pageW - marginR, ruleY);

  // Diamond
  doc.setFillColor(...gold);
  const cx = pageW / 2;
  const cy = ruleY;
  doc.triangle(cx, cy - 1.8, cx + 1.8, cy, cx, cy + 1.8, "F");
  doc.triangle(cx, cy - 1.8, cx - 1.8, cy, cx, cy + 1.8, "F");

  // ── CLIENT INFO ────────────────────────────────────────
  let y = ruleY + 10;

  // Left col: Client + Phone
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("Name:", marginL, y);
  doc.setFont("helvetica", "normal");
  doc.text(`   M/s/Mr. ${record.memberName}`, marginL + doc.getTextWidth("Name:"), y);

  const y2 = y + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Phn No.:", marginL, y2);
  doc.setFont("helvetica", "normal");
  doc.text(`   ${record.phone || "—"}`, marginL + doc.getTextWidth("Phn No.:"), y2);

  // Right col: Pick-up Date + Return Date
  const rightX = pageW - marginR;

  const puLabel = "Pick-up Date:";
  const puVal = `  ${fmtDate(record.rentDate)}`;
  doc.setFont("helvetica", "bold");
  doc.text(puLabel, rightX - doc.getTextWidth(puLabel + puVal), y);
  doc.setFont("helvetica", "normal");
  doc.text(puVal, rightX - doc.getTextWidth(puVal), y);

  const retLabel = "Return Date:";
  const retVal = `  ${fmtDate(record.returnDate)}`;
  doc.setFont("helvetica", "bold");
  doc.text(retLabel, rightX - doc.getTextWidth(retLabel + retVal), y2);
  doc.setFont("helvetica", "normal");
  doc.text(retVal, rightX - doc.getTextWidth(retVal), y2);

  // Thin separator rule
  y = y2 + 8;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);

  // ── ITEMS SECTION ───────────────────────────────────────
  y += 10;
  doc.setFont("times", "bolditalic");
  doc.setFontSize(14);
  doc.setTextColor(...gold);
  doc.text("Items", marginL, y);

  y += 4;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);

  const colItem = marginL + 2;
  const colQty = pageW - marginR - 50;
  const colPrice = pageW - marginR - 2;
  const rowH = 8;

  y += rowH - 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...black);
  doc.text("Item Description", colItem, y);
  doc.text("Quantity", colQty, y, { align: "right" });
  doc.text("Total Price", colPrice, y, { align: "right" });

  y += 2;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...black);

  y += rowH;
  doc.text(record.outfit, colItem, y);
  doc.text("1 Pc", colQty, y, { align: "right" });
  doc.text(Number(record.price).toLocaleString("en-IN"), colPrice, y, {
    align: "right",
  });

  y += 3;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);

  y += rowH - 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...black);
  doc.text("TOTAL ITEM COUNT", colItem, y);
  doc.text("1", colQty, y, { align: "right" });
  doc.text(Number(record.price).toLocaleString("en-IN"), colPrice, y, {
    align: "right",
  });

  y += 3;
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);

  // ── PAYMENT SUMMARY ────────────────────────────────────
  y += 14;
  const sumLabelX = pageW - marginR - 58;
  const sumValueX = pageW - marginR;

  const drawSumRow = (label: string, value: string): void => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text(label, sumLabelX, y);
    doc.text(value, sumValueX, y, { align: "right" });
    y += 8;
  };

  const totalAmount = Number(record.price);
  const advance = Number(record.advance);
  const balance = totalAmount - advance;

  drawSumRow("Total Amount:", totalAmount.toLocaleString("en-IN"));
  drawSumRow("Advance Paid:", advance.toLocaleString("en-IN"));

  doc.setDrawColor(...black);
  doc.setLineWidth(0.3);
  doc.line(sumLabelX, y - 4, sumValueX, y - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...black);
  doc.text("Balance Due:", sumLabelX, y + 2);
  doc.text(balance.toLocaleString("en-IN"), sumValueX, y + 2, {
    align: "right",
  });

  // ── THANK YOU ──────────────────────────────────────────
  y = 250;
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("Thank you for choosing The Gayatri Collection!", pageW / 2, y, {
    align: "center",
  });

  // Footer rule
  y += 5;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.4);
  doc.line(marginL, y, pageW - marginR, y);

  // ── FOOTER ─────────────────────────────────────────────
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...black);
  const visitLabel = "Visit our Website:";
  doc.text(visitLabel, marginL, y);
  const visitLabelW = doc.getTextWidth(visitLabel + " ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...linkBlue);
  const websiteText = "www.gayatricollection.in";
  doc.text(websiteText, marginL + visitLabelW, y);
  const websiteW = doc.getTextWidth(websiteText + "    ");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  const reviewLabel = "Leave us a Review:";
  doc.text(reviewLabel, marginL + visitLabelW + websiteW, y);
  const reviewLabelW = doc.getTextWidth(reviewLabel + " ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...linkBlue);
  doc.text(
    "Click here to review us on Google",
    marginL + visitLabelW + websiteW + reviewLabelW,
    y
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.text("1", pageW / 2, pageH - 8, { align: "center" });

  const slug = (record.memberName || "invoice")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase()
    .slice(0, 40);
  doc.save(`gayatri_collection_invoice_${slug}.pdf`);
}

/**
 * Generates and downloads a branded PDF invoice for Anjali Makeover bookings.
 */
export function generateMakeupPDF(record: MakeupRecordForPDF): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;
  const marginL = 20;
  const marginR = 20;
  const black: [number, number, number] = [0, 0, 0];
  const pink: [number, number, number] = [224, 32, 106];
  const linkBlue: [number, number, number] = [34, 85, 204];

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  // ── TITLE ──────────────────────────────────────────────
  const titleY = 32;

  doc.setFontSize(38);
  doc.setFont("times", "bolditalic");
  doc.setTextColor(...pink);
  const anjaliW = doc.getTextWidth("ANJALI");

  doc.setFontSize(34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  const makeoverW = doc.getTextWidth(" MAKEOVER");

  const totalTitleW = anjaliW + makeoverW;
  const titleX = (pageW - totalTitleW) / 2;

  // Draw ANJALI
  doc.setFontSize(38);
  doc.setFont("times", "bolditalic");
  doc.setTextColor(...pink);
  doc.text("ANJALI", titleX, titleY);

  // Draw MAKEOVER
  doc.setFontSize(34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text(" MAKEOVER", titleX + anjaliW, titleY);

  // Rule below title
  doc.setDrawColor(...black);
  doc.setLineWidth(0.4);
  doc.line(marginL, titleY + 5, pageW - marginR, titleY + 5);

  // ── CLIENT INFO ────────────────────────────────────────
  let y = titleY + 14;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("Client:", marginL, y);
  doc.setFont("helvetica", "normal");
  doc.text(`   M/s/Mr. ${record.clientName}`, marginL + doc.getTextWidth("Client:"), y);

  const yPhone = y + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Phn No.:", marginL, yPhone);
  doc.setFont("helvetica", "normal");
  doc.text(`   ${record.phone || "—"}`, marginL + doc.getTextWidth("Phn No.:"), yPhone);

  // Date + Venue right side
  const rightX = pageW - marginR;
  const dateLabel = "Date:";
  const dateVal = `  ${fmtDate(record.bookingDate)}`;
  const venueLabel = "Venue:";
  const venueVal = `  ${record.venue || "—"}`;

  doc.setFont("helvetica", "bold");
  doc.text(dateLabel, rightX - doc.getTextWidth(dateLabel + dateVal), y);
  doc.setFont("helvetica", "normal");
  doc.text(dateVal, rightX - doc.getTextWidth(dateVal), y);

  const y2 = y + 6;
  doc.setFont("helvetica", "bold");
  doc.text(venueLabel, rightX - doc.getTextWidth(venueLabel + venueVal), y2);
  doc.setFont("helvetica", "normal");
  doc.text(venueVal, rightX - doc.getTextWidth(venueVal), y2);

  // ── SERVICES SECTION ───────────────────────────────────
  y = y2 + 14;
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...black);
  doc.text("Services", marginL, y);

  y += 4;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);

  // Table header
  const colService = marginL + 2;
  const colDate = marginL + 98;
  const colQty = pageW - marginR - 30;
  const colPrice = pageW - marginR - 2;
  const rowH = 8;

  y += rowH - 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...black);
  doc.text("Service Category", colService, y);
  doc.text("Date", colDate, y);
  doc.text("Qty", colQty, y, { align: "right" });
  doc.text("Total Price", colPrice, y, { align: "right" });

  y += 2;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);

  // Service rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const parseServicesForPDF = (
    services: string | ServiceItemForPDF[] | undefined
  ): ServiceItemForPDF[] => {
    if (!services) return [];
    if (Array.isArray(services)) {
      return services.map((s) => {
        if (typeof s === "string") return { name: s, price: 0, qty: 1, date: "" };
        const numQty = typeof s.qty === "number" ? s.qty : parseInt(String(s.qty || 1));
        return {
          name: s.name || "",
          price: Number(s.price) || 0,
          qty: isNaN(numQty) ? 1 : numQty,
          date: s.date || "",
        };
      });
    }
    if (typeof services === "string") {
      const trimmed = services.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((s: unknown) => {
              if (typeof s === "string") return { name: s, price: 0, qty: 1, date: "" };
              const item = s as { name?: string; price?: number | string; qty?: string | number; date?: string };
              const numQty = typeof item?.qty === "number" ? item.qty : parseInt(String(item?.qty || 1));
              return {
                name: item?.name || "",
                price: Number(item?.price) || 0,
                qty: isNaN(numQty) ? 1 : numQty,
                date: item?.date || "",
              };
            });
          }
        } catch {
          // fall through to comma separated
        }
      }
      return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          price: 0, // older services hold price 0 for backward compatibility
          qty: 1,
          date: "",
        }));
    }
    return [];
  };

  const parsedServices = parseServicesForPDF(record.services);
  const servicesList: ServiceItemForPDF[] =
    parsedServices.length > 0
      ? parsedServices
      : [{ name: "Makeup Service", price: Number(record.totalPrice) || 0, qty: 1, date: record.bookingDate }];
  const serviceCount = record.noOfServices || servicesList.length || 1;

  servicesList.forEach((item) => {
    y += rowH;
    const qtyText = String(item.qty || 1);
    doc.text(item.name, colService, y);
    doc.text(fmtDate(item.date || record.bookingDate), colDate, y);
    doc.text(qtyText, colQty, y, { align: "right" });
    doc.text(Number(item.price).toLocaleString("en-IN"), colPrice, y, {
      align: "right",
    });
  });

  // Total row top rule
  y += 3;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);

  // TOTAL SERVICE COUNT
  y += rowH - 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL SERVICE COUNT", colService, y);
  doc.text(String(serviceCount), colQty, y, { align: "right" });
  doc.text(Number(record.totalPrice).toLocaleString("en-IN"), colPrice, y, {
    align: "right",
  });

  // Table bottom rule
  y += 3;
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);

  // ── PAYMENT SUMMARY ────────────────────
  y += 14;
  const sumLabelX = pageW - marginR - 64;
  const sumValueX = pageW - marginR;

  const drawSumRow = (label: string, value: string, bold: boolean = false): void => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text(label, sumLabelX, y);
    doc.text(value, sumValueX, y, { align: "right" });
    y += 8;
  };

  const travelFee = Number(record.travelAmount || 0);
  const grandTotal = Number(record.totalPrice) + travelFee;
  const advance = Number(record.advance || 0);
  const balance = grandTotal - advance;

  if (travelFee > 0) {
    drawSumRow("Services Total:", Number(record.totalPrice).toLocaleString("en-IN"), false);
    drawSumRow("Travel Fee:", travelFee.toLocaleString("en-IN"), false);
    drawSumRow("Total Amount:", grandTotal.toLocaleString("en-IN"), true);
  } else {
    drawSumRow("Total Amount:", grandTotal.toLocaleString("en-IN"), false);
  }

  drawSumRow("Advance Paid:", advance.toLocaleString("en-IN"), false);

  // Rule above Balance Due
  doc.setDrawColor(...black);
  doc.setLineWidth(0.3);
  doc.line(sumLabelX, y - 4, sumValueX, y - 4);

  // Balance Due
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...black);
  doc.text("Balance Due:", sumLabelX, y + 2);
  doc.text(balance.toLocaleString("en-IN"), sumValueX, y + 2, {
    align: "right",
  });

  // ── THANK YOU ──────────────────────────────────────────
  y = 248;
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Thank you for your business!", pageW / 2, y, { align: "center" });

  // Footer rule
  y += 5;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.4);
  doc.line(marginL, y, pageW - marginR, y);

  // ── FOOTER ─────────────────────────────────────────────
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...black);
  const visitLabel = "Visit our Website:";
  doc.text(visitLabel, marginL, y);
  const visitLabelW = doc.getTextWidth(visitLabel + " ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...linkBlue);
  const websiteText = "www.anjalimakeover.co.in";
  doc.text(websiteText, marginL + visitLabelW, y);
  const websiteW = doc.getTextWidth(websiteText + "    ");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  const reviewLabel = "Leave us a Review:";
  doc.text(reviewLabel, marginL + visitLabelW + websiteW, y);
  const reviewLabelW = doc.getTextWidth(reviewLabel + " ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...linkBlue);
  doc.text(
    "Click here to review us on Google",
    marginL + visitLabelW + websiteW + reviewLabelW,
    y
  );

  // Page number
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.text("1", pageW / 2, pageH - 8, { align: "center" });

  const slug = (record.clientName || "invoice")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase()
    .slice(0, 40);
  doc.save(`anjali_makeover_invoice_${slug}.pdf`);
}
