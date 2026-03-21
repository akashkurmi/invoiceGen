import { useState, useRef } from "react";
import jsPDF from "jspdf";

interface Item {
  id: number;
  name: string;
  qty: string;
  price: number;
}

const defaultItems: Item[] = [
  { id: 1, name: "Bridal Lehenga", qty: "1 Pc", price: 15000 },
  { id: 2, name: "Groom Sherwani", qty: "1 Pc", price: 8000 },
  { id: 3, name: "Haldi Outfit", qty: "1 Pc", price: 3000 },
  { id: 4, name: "Sangeet Lehenga", qty: "1 Pc", price: 5000 },
  { id: 5, name: "Dupatta & Accessories", qty: "1 Set", price: 2500 },
];

export default function GayatriCollection() {
  const [client, setClient] = useState<string>(
    "M/s Sneha Jain & Mr. Adarsh Jain"
  );
  const [pickupDate, setPickupDate] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [advance, setAdvance] = useState<number>(5000);
  const [items, setItems] = useState<Item[]>(defaultItems);
  const [editing, setEditing] = useState<boolean>(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const totalAmount: number = items.reduce((s, r) => s + Number(r.price), 0);
  const balance: number = totalAmount - Number(advance);
  const totalQty: number = items.reduce((s, r) => {
    const n = parseInt(r.qty);
    return s + (isNaN(n) ? 1 : n);
  }, 0);

  const handleItemChange = (
    id: number,
    field: keyof Item,
    val: string | number
  ): void => {
    setItems(items.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  };

  const addRow = (): void => {
    setItems([...items, { id: Date.now(), name: "", qty: "1 Pc", price: 0 }]);
  };

  const removeRow = (id: number): void => {
    setItems(items.filter((s) => s.id !== id));
  };

  // Format date from YYYY-MM-DD to readable "DD MMM YYYY"
  const fmtDate = (d: string): string => {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const generatePDF = (): void => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const pageW = 210;
    const pageH = 297;
    const marginL = 20;
    const marginR = 20;
    const black: [number, number, number] = [0, 0, 0];
    const gold: [number, number, number] = [162, 112, 34];
    const darkGold: [number, number, number] = [120, 80, 20];
    const linkBlue: [number, number, number] = [34, 85, 204];
    const lightGray: [number, number, number] = [240, 236, 228];

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, "F");

    // ── TITLE ──────────────────────────────────────────────
    // "The" small italic gold serif, then "Gayatri" large bold italic serif gold,
    // then "Collection" bold spaced helvetica black — all centered together
    const titleY = 22;

    // "The" — small italic above, centered
    doc.setFont("times", "italic");
    doc.setFontSize(13);
    doc.setTextColor(...gold);
    doc.text("The", pageW / 2, titleY, { align: "center" });

    // "Gayatri" bold italic times in gold + "Collection" bold helvetica black — same baseline
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

    // Ornamental rule: thin gold line with diamond centre
    const ruleY = mainY + 6;
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.3);
    doc.line(marginL, ruleY, pageW / 2 - 4, ruleY);
    doc.line(pageW / 2 + 4, ruleY, pageW - marginR, ruleY);
    // Diamond
    doc.setFillColor(...gold);
    const cx = pageW / 2,
      cy = ruleY;
    doc.triangle(cx, cy - 1.8, cx + 1.8, cy, cx, cy + 1.8, "F");
    doc.triangle(cx, cy - 1.8, cx - 1.8, cy, cx, cy + 1.8, "F");

    // ── CLIENT INFO ────────────────────────────────────────
    let y = ruleY + 10;

    // Left col: Client + Phone
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text("Client:", marginL, y);
    doc.setFont("helvetica", "normal");
    doc.text(` ${client}`, marginL + doc.getTextWidth("Client:"), y);

    const y2 = y + 6;
    doc.setFont("helvetica", "bold");
    doc.text("Phn No.:", marginL, y2);
    doc.setFont("helvetica", "normal");
    doc.text(` ${phone || "—"}`, marginL + doc.getTextWidth("Phn No.:"), y2);

    // Right col: Pick-up Date + Return Date
    const rightX = pageW - marginR;

    const puLabel = "Pick-up Date:";
    const puVal = `  ${fmtDate(pickupDate)}`;
    doc.setFont("helvetica", "bold");
    doc.text(puLabel, rightX - doc.getTextWidth(puLabel + puVal), y);
    doc.setFont("helvetica", "normal");
    doc.text(puVal, rightX - doc.getTextWidth(puVal), y);

    const retLabel = "Return Date:";
    const retVal = `  ${fmtDate(returnDate)}`;
    doc.setFont("helvetica", "bold");
    doc.text(retLabel, rightX - doc.getTextWidth(retLabel + retVal), y2);
    doc.setFont("helvetica", "normal");
    doc.text(retVal, rightX - doc.getTextWidth(retVal), y2);

    // Thin separator rule
    y = y2 + 7;
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
    items.forEach((s: Item) => {
      y += rowH;
      doc.text(s.name, colItem, y);
      doc.text(s.qty, colQty, y, { align: "right" });
      doc.text(Number(s.price).toLocaleString("en-IN"), colPrice, y, {
        align: "right",
      });
    });

    y += 3;
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);

    y += rowH - 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text("TOTAL ITEM COUNT", colItem, y);
    doc.text(String(totalQty), colQty, y, { align: "right" });
    doc.text(totalAmount.toLocaleString("en-IN"), colPrice, y, {
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

    drawSumRow("Total Amount:", totalAmount.toLocaleString("en-IN"));
    drawSumRow("Advance Paid:", Number(advance).toLocaleString("en-IN"));

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

    const slug = client
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase()
      .slice(0, 40);
    doc.save(`gayatri_collection_invoice_${slug}.pdf`);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f0e8; }

        .gc-wrapper {
          min-height: 100vh;
          background: linear-gradient(150deg, #fdfaf4 0%, #f5ede0 100%);
          font-family: 'EB Garamond', serif;
          padding: 24px 16px 56px;
        }

        /* ── APP TITLE BAR ── */
        .gc-title-bar {
          text-align: center;
          margin-bottom: 20px;
        }
        .gc-title-main {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(11px, 2.8vw, 14px);
          font-weight: 300;
          font-style: italic;
          letter-spacing: 5px;
          color: #a27022;
          display: block;
        }
        .gc-title-sub {
          font-family: 'Cinzel', serif;
          font-size: clamp(9px, 2vw, 11px);
          letter-spacing: 3px;
          color: #c4a060;
          display: block;
          margin-top: 2px;
          text-transform: uppercase;
        }
        .gc-title-rule {
          width: 50px;
          height: 1px;
          background: linear-gradient(to right, transparent, #a27022, transparent);
          margin: 8px auto 0;
        }

        .gc-controls {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          padding: 0 8px;
        }

        .gc-btn {
          font-family: 'Cinzel', serif;
          font-size: clamp(10px, 2.5vw, 12px);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 10px 22px;
          border-radius: 1px;
          cursor: pointer;
          border: 1px solid;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .gc-btn-edit { background: #fff; border-color: #a27022; color: #a27022; }
        .gc-btn-edit:hover, .gc-btn-edit:active { background: #a27022; color: #fff; }
        .gc-btn-download { background: #1a1a1a; border-color: #1a1a1a; color: #fff; }
        .gc-btn-download:hover, .gc-btn-download:active { background: #333; }
        .gc-btn-add {
          background: #f4f0e8;
          border-color: #a27022;
          color: #7a5010;
          font-size: clamp(9px, 2vw, 11px);
          padding: 7px 16px;
        }
        .gc-btn-add:hover, .gc-btn-add:active { background: #a27022; color: #fff; }
        .gc-btn-remove {
          background: none; border: none;
          color: #cc5555; cursor: pointer;
          font-size: 18px; padding: 0 6px;
          line-height: 1; flex-shrink: 0;
          touch-action: manipulation;
        }

        /* ── INVOICE CARD ── */
        .gc-card {
          background: #fff;
          max-width: 760px;
          margin: 0 auto;
          padding: clamp(24px, 6vw, 52px) clamp(18px, 6vw, 60px) clamp(24px, 5vw, 48px);
          box-shadow: 0 8px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.05);
        }

        /* ── HEADER ── */
        .gc-header {
          text-align: center;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .gc-the {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-weight: 300;
          font-size: clamp(12px, 3vw, 15px);
          letter-spacing: 5px;
          color: #a27022;
          display: block;
          margin-bottom: 2px;
        }
        .gc-brand-line {
          display: block;
          line-height: 1.05;
        }
        .gc-brand-gayatri {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-weight: 700;
          font-size: clamp(30px, 9vw, 52px);
          color: #a27022;
          letter-spacing: 2px;
        }
        .gc-brand-collection {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: clamp(22px, 6.5vw, 38px);
          color: #1a1a1a;
          letter-spacing: clamp(2px, 1vw, 5px);
        }
        .gc-brand-tagline {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: clamp(9px, 2.2vw, 11px);
          letter-spacing: clamp(3px, 1.5vw, 7px);
          text-transform: uppercase;
          color: #999;
          display: block;
          margin-top: 5px;
        }
        .gc-header-rule-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
        }
        .gc-header-rule { flex: 1; height: 1px; background: #1a1a1a; }
        .gc-header-diamond {
          width: 5px; height: 5px;
          background: #a27022;
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        /* ── META ── */
        .gc-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 20px;
          margin-bottom: 28px;
          font-size: clamp(12px, 3vw, 15px);
        }
        .gc-meta-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .gc-meta-label {
          font-size: clamp(9px, 2vw, 10px);
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #a27022;
          font-family: 'Cinzel', serif;
          font-weight: 400;
        }
        .gc-meta-value {
          font-weight: 600;
          color: #1a1a1a;
          word-break: break-word;
        }
        .gc-meta-input {
          border: none;
          border-bottom: 1px dashed #c4a060;
          background: #fffdf8;
          font-family: 'EB Garamond', serif;
          font-size: clamp(13px, 3.2vw, 15px);
          font-weight: 600;
          color: #1a1a1a;
          outline: none;
          width: 100%;
          padding: 2px 0;
          -webkit-appearance: none;
        }
        .gc-meta-input:focus { border-bottom-color: #a27022; background: #fff8f0; }
        .gc-meta-input[type="date"] { font-weight: 400; }

        /* ── SECTION TITLE ── */
        .gc-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: clamp(16px, 4vw, 22px);
          font-weight: 600;
          color: #a27022;
          margin-bottom: 6px;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gc-section-title::before {
          content: '';
          display: inline-block;
          width: 4px; height: 4px;
          background: #a27022;
          transform: rotate(45deg);
          flex-shrink: 0;
        }
        .gc-section-rule { flex: 1; height: 1px; background: #1a1a1a; }

        /* ── TABLE ── */
        .gc-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 28px;
          font-size: clamp(11px, 2.8vw, 14.5px);
        }
        .gc-table th {
          font-family: 'Cinzel', serif;
          font-weight: 600;
          font-size: clamp(9px, 2.2vw, 11px);
          letter-spacing: 1px;
          text-align: left;
          padding: 8px 6px 8px 0;
          border-top: 1px solid #1a1a1a;
          border-bottom: 1px solid #1a1a1a;
          color: #1a1a1a;
        }
        .gc-table th:not(:first-child),
        .gc-table td:not(:first-child) { text-align: right; }
        .gc-table td {
          padding: 7px 6px 7px 0;
          color: #1a1a1a;
          vertical-align: middle;
        }
        .gc-table tr.gc-total-row td {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: clamp(10px, 2.5vw, 12px);
          letter-spacing: 0.5px;
          border-top: 1.5px solid #1a1a1a;
          padding-top: 8px;
        }

        /* Editable inputs */
        .gc-editable {
          width: 100%;
          border: none;
          border-bottom: 1px dashed #c4a060;
          background: #fffdf8;
          font-family: 'EB Garamond', serif;
          font-size: clamp(12px, 3vw, 14.5px);
          color: #1a1a1a;
          padding: 2px 2px;
          outline: none;
          -webkit-appearance: none;
        }
        .gc-editable:focus { border-bottom-color: #a27022; background: #fff8f0; }
        .gc-editable.right { text-align: right; }

        /* ── SUMMARY ── */
        .gc-summary {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-bottom: 40px;
        }
        .gc-summary-table {
          width: min(280px, 100%);
          font-size: clamp(13px, 3.2vw, 15px);
        }
        .gc-summary-table td { padding: 4px 0; }
        .gc-summary-table td:last-child { text-align: right; }
        .gc-summary-table .gc-sum-label { font-weight: 700; }
        .gc-summary-divider {
          border: none;
          border-top: 1.5px solid #1a1a1a;
          margin: 4px 0;
          width: 100%;
        }
        .gc-summary-balance td {
          font-family: 'Cinzel', serif;
          font-size: clamp(16px, 4.5vw, 20px);
          font-weight: 700;
          letter-spacing: 1px;
          padding-top: 6px;
        }

        /* ── THANK YOU ── */
        .gc-thankyou {
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: clamp(13px, 3.5vw, 16px);
          font-weight: 300;
          color: #777;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }

        /* ── FOOTER ── */
        .gc-footer {
          border-top: 1.5px solid #1a1a1a;
          padding-top: 12px;
          display: flex;
          gap: 16px 32px;
          font-size: clamp(11px, 2.5vw, 13.5px);
          flex-wrap: wrap;
        }
        .gc-footer a { color: #2255cc; text-decoration: none; word-break: break-all; }

        .gc-edit-hint {
          text-align: center;
          font-size: clamp(11px, 2.5vw, 12px);
          color: #a27022;
          margin-bottom: 10px;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          letter-spacing: 1px;
        }

        @media (max-width: 480px) {
          .gc-meta { grid-template-columns: 1fr; }
          .gc-summary-table { width: 100%; }
          .gc-footer { flex-direction: column; gap: 8px; }
          input[type="number"], input[type="tel"], input[type="date"] { font-size: 16px; }
        }

        @media print {
          @page { margin: 0.6in; size: A4; }
          body { background: white !important; }
          .gc-title-bar, .gc-controls, .gc-edit-hint { display: none !important; }
          .gc-wrapper { padding: 0; background: white !important; }
          .gc-card { box-shadow: none; padding: 0; }
          .gc-btn-remove { display: none !important; }
          .gc-editable, .gc-meta-input { border-bottom: none !important; background: transparent !important; }
        }
      `}</style>

      <div className="gc-wrapper">
        {/* ── APP TITLE ── */}
        <div className="gc-title-bar">
          <span className="gc-title-main">The Gayatri Collection</span>
          <span className="gc-title-sub">Invoice Generator</span>
          <div className="gc-title-rule" />
        </div>

        {/* ── CONTROLS ── */}
        <div className="gc-controls">
          <button
            className="gc-btn gc-btn-edit"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "✓ Done Editing" : "✎ Edit Invoice"}
          </button>
          <button className="gc-btn gc-btn-download" onClick={generatePDF}>
            ⬇ Download PDF
          </button>
        </div>

        {editing && <p className="gc-edit-hint">Click any field to edit it</p>}

        <div className="gc-card" ref={invoiceRef}>
          {/* ── HEADER ── */}
          <div className="gc-header">
            <span className="gc-the">— The —</span>
            <span className="gc-brand-line">
              <span className="gc-brand-gayatri">Gayatri </span>
              <span className="gc-brand-collection">Collection</span>
            </span>
            <span className="gc-brand-tagline">
              Curated Bridal &amp; Occasion Wear
            </span>
            <div className="gc-header-rule-wrap">
              <div className="gc-header-rule" />
              <div className="gc-header-diamond" />
              <div className="gc-header-rule" />
            </div>
          </div>

          {/* ── META ── */}
          <div className="gc-meta">
            {/* Client */}
            <div className="gc-meta-row">
              <span className="gc-meta-label">Client</span>
              {editing ? (
                <input
                  className="gc-meta-input"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Client name"
                />
              ) : (
                <span className="gc-meta-value">{client}</span>
              )}
            </div>

            {/* Phone */}
            <div className="gc-meta-row">
              <span className="gc-meta-label">Phn No.</span>
              {editing ? (
                <input
                  className="gc-meta-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 00000 00000"
                />
              ) : (
                <span className="gc-meta-value">{phone || "—"}</span>
              )}
            </div>

            {/* Pick-up Date */}
            <div className="gc-meta-row">
              <span className="gc-meta-label">Pick-up Date</span>
              {editing ? (
                <input
                  className="gc-meta-input"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              ) : (
                <span className="gc-meta-value">{fmtDate(pickupDate)}</span>
              )}
            </div>

            {/* Return Date */}
            <div className="gc-meta-row">
              <span className="gc-meta-label">Return Date</span>
              {editing ? (
                <input
                  className="gc-meta-input"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              ) : (
                <span className="gc-meta-value">{fmtDate(returnDate)}</span>
              )}
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <div className="gc-section-title">
            Items
            <span className="gc-section-rule" />
          </div>
          <table className="gc-table">
            <thead>
              <tr>
                <th style={{ width: "62%" }}>Item Description</th>
                <th style={{ width: "19%" }}>Quantity</th>
                <th style={{ width: "19%" }}>Total Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row: Item) => (
                <tr key={row.id}>
                  <td>
                    {editing ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          className="gc-btn-remove"
                          onClick={() => removeRow(row.id)}
                          title="Remove"
                        >
                          ×
                        </button>
                        <input
                          className="gc-editable"
                          value={row.name}
                          onChange={(e) =>
                            handleItemChange(row.id, "name", e.target.value)
                          }
                        />
                      </span>
                    ) : (
                      row.name
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        className="gc-editable right"
                        value={row.qty}
                        onChange={(e) =>
                          handleItemChange(row.id, "qty", e.target.value)
                        }
                        style={{ width: "80px" }}
                      />
                    ) : (
                      row.qty
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        className="gc-editable right"
                        type="number"
                        value={row.price}
                        onChange={(e) =>
                          handleItemChange(
                            row.id,
                            "price",
                            Number(e.target.value)
                          )
                        }
                        style={{ width: "80px" }}
                      />
                    ) : (
                      Number(row.price).toLocaleString("en-IN")
                    )}
                  </td>
                </tr>
              ))}
              {editing && (
                <tr>
                  <td colSpan={3} style={{ paddingTop: 8 }}>
                    <button className="gc-btn gc-btn-add" onClick={addRow}>
                      + Add Item
                    </button>
                  </td>
                </tr>
              )}
              <tr className="gc-total-row">
                <td>TOTAL ITEM COUNT</td>
                <td>{totalQty}</td>
                <td>{totalAmount.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>

          {/* ── SUMMARY ── */}
          <div className="gc-summary">
            <table className="gc-summary-table">
              <tbody>
                <tr>
                  <td className="gc-sum-label">Total Amount:</td>
                  <td>{totalAmount.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td className="gc-sum-label">Advance Paid:</td>
                  <td>
                    {editing ? (
                      <input
                        className="gc-editable right"
                        type="number"
                        value={advance}
                        onChange={(e) => setAdvance(Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                    ) : (
                      Number(advance).toLocaleString("en-IN")
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <hr
              className="gc-summary-divider"
              style={{ width: "min(280px, 100%)" }}
            />
            <table className="gc-summary-table">
              <tbody>
                <tr className="gc-summary-balance">
                  <td className="gc-sum-label">Balance Due:</td>
                  <td>{balance.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── THANK YOU ── */}
          <div className="gc-thankyou">
            Thank you for choosing The Gayatri Collection!
          </div>

          {/* ── FOOTER ── */}
          <div className="gc-footer">
            <span>
              <strong>Visit our Website:</strong>{" "}
              <a
                href="https://www.gayatricollection.in"
                target="_blank"
                rel="noreferrer"
              >
                www.gayatricollection.in
              </a>
            </span>
            <span>
              <strong>Leave us a Review:</strong>{" "}
              <a
                href="https://g.page/r/review"
                target="_blank"
                rel="noreferrer"
              >
                Click here to review us on Google
              </a>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
