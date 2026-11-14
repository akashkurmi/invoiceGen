import { useState, useRef, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import "./Template.css";

interface Service {
  id: number;
  name: string;
  date: string;
  qty: number | string;
  price: number;
}

interface ServiceError {
  date?: string;
  qty?: string;
}

interface FormErrors {
  client?: string;
  bookingDate?: string;
  phone?: string;
  services?: Record<number, ServiceError>;
}

const defaultServices: Service[] = [
  { id: 1, name: "Bridal Makeup", date: new Date().toISOString().split("T")[0], qty: 1, price: 10000 },
];

const serviceOptions = [
  "Bridal Makeup",
  "Bride Phere Makeup",
  "Haldi Makeup",
  "Engagement Makeup",
  "Sangeet Makeup",
  "Basic Makeup",
  "Groom Makeup",
  "Nude/Basic Makeup",
  "Matte Makeup",
  "HD Makeup",
  "Dewy Makeup",
  "Airbrush Makeup",
  "Sweat Proof Makeup",
  "3D Makeup",
  "No Makeup Look",
  "Glossy Makeup",
  "Dramatic Makeup",
  "Custom"
];

const formatDisplayDate = (d: string): string => {
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

export default function InvoiceGenerator() {
  const [client, setClient] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [venue, setVenue] = useState<string>("");
  const [advance, setAdvance] = useState<number>(0);
  const [includeTravel, setIncludeTravel] = useState<boolean>(false);
  const [travelAmount, setTravelAmount] = useState<number | "">("");
  const [services, setServices] = useState<Service[]>(defaultServices);
  const [editing, setEditing] = useState<boolean>(true);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const travelInputRef = useRef<HTMLInputElement>(null);

  // Validation state
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [errorList, setErrorList] = useState<string[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [popupError, setPopupError] = useState<string>("");

  // Popup state
  const [showAddPopup, setShowAddPopup] = useState<boolean>(false);
  const [selectedDefaultService, setSelectedDefaultService] = useState<string>("Bridal Makeup");
  const [customServiceName, setCustomServiceName] = useState<string>("");
  const [includeHairstyle, setIncludeHairstyle] = useState<boolean>(true);
  const [includeLens, setIncludeLens] = useState<boolean>(true);
  const [includeLashes, setIncludeLashes] = useState<boolean>(true);
  const [popupServiceDate, setPopupServiceDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [popupServiceQty, setPopupServiceQty] = useState<number>(1);

  // Submit popup state
  const [showSubmitPopup, setShowSubmitPopup] = useState<boolean>(false);
  const [updateList, setUpdateList] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const totalAmount: number = services.reduce((s, r) => s + Number(r.price), 0);
  const effectiveTravel: number = includeTravel ? (Number(travelAmount) || 0) : 0;
  const grandTotal: number = totalAmount + effectiveTravel;
  const balance: number = grandTotal - Number(advance);
  const totalQty: number = services.reduce((s, r) => {
    const n = typeof r.qty === "number" ? r.qty : parseInt(String(r.qty));
    return s + (isNaN(n) ? 0 : Math.max(0, n));
  }, 0);

  const validateForm = useCallback((
    currentClient = client,
    currentPhone = phone,
    currentBookingDate = bookingDate,
    currentServices = services
  ): { errors: FormErrors; errorList: string[] } => {
    const errs: FormErrors = {};
    const errList: string[] = [];

    // 1. Client name is required
    if (!currentClient || currentClient.trim() === "") {
      errs.client = "Client name is required";
      errList.push("Client name is required");
    }

    // 2. Date is required
    if (!currentBookingDate || currentBookingDate.trim() === "") {
      errs.bookingDate = "Date is required";
      errList.push("Date is required");
    }

    // 3. Phone no. is required and 10 no. only
    const digitsOnly = currentPhone.replace(/\D/g, "");
    if (!currentPhone || currentPhone.trim() === "") {
      errs.phone = "Phone number is required";
      errList.push("Phone number is required (10 digits)");
    } else if (digitsOnly.length !== 10) {
      errs.phone = "Phone number must be exactly 10 digits";
      errList.push("Phone number must be exactly 10 digits");
    }

    // 4. Quantity greater than 0 and date of every service required
    if (currentServices.length === 0) {
      errList.push("At least one service is required");
    } else {
      const serviceErrs: Record<number, ServiceError> = {};
      let hasDateErr = false;
      let hasQtyErr = false;

      currentServices.forEach((s) => {
        const sErr: ServiceError = {};
        if (!s.date || s.date.trim() === "") {
          sErr.date = "Date required";
          hasDateErr = true;
        }

        const q = typeof s.qty === "number" ? s.qty : Number(s.qty);
        if (s.qty === "" || isNaN(q) || q <= 0) {
          sErr.qty = "Qty must be > 0";
          hasQtyErr = true;
        }

        if (sErr.date || sErr.qty) {
          serviceErrs[s.id] = sErr;
        }
      });

      if (hasDateErr) {
        errList.push("Date is required for every service");
      }
      if (hasQtyErr) {
        errList.push("Quantity must be greater than 0 for every service");
      }

      if (Object.keys(serviceErrs).length > 0) {
        errs.services = serviceErrs;
      }
    }

    return { errors: errs, errorList: errList };
  }, [client, phone, bookingDate, services]);

  useEffect(() => {
    if (hasAttemptedSubmit) {
      const { errors, errorList: list } = validateForm();
      setFormErrors(errors);
      setErrorList(list);
    }
  }, [hasAttemptedSubmit, validateForm]);

  const handleServiceChange = (
    id: number,
    field: keyof Service,
    val: string | number
  ): void => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const openAddPopup = () => {
    setPopupError("");
    setPopupServiceDate(bookingDate || new Date().toISOString().split("T")[0]);
    setPopupServiceQty(1);
    setShowAddPopup(true);
  };

  const handleAddServiceSubmit = () => {
    if (!popupServiceDate || popupServiceDate.trim() === "") {
      setPopupError("Service date is required");
      return;
    }
    const q = Number(popupServiceQty);
    if (!popupServiceQty || isNaN(q) || q <= 0) {
      setPopupError("Quantity must be greater than 0");
      return;
    }
    setPopupError("");

    let finalName = selectedDefaultService === "Custom" ? (customServiceName.trim() || "Custom Service") : selectedDefaultService;
    
    const addOns: string[] = [];
    if (includeHairstyle && !finalName.includes("Hairstyle")) addOns.push("Hairstyle");
    if (includeLens && !finalName.includes("Lens")) addOns.push("Lens");
    if (includeLashes && !finalName.includes("Lashes")) addOns.push("Lashes");

    if (addOns.length > 0) {
      finalName += " + " + addOns.join(" + ");
    }

    let defaultPrice = 0;
    if (selectedDefaultService !== "Custom") {
       const found = defaultServices.find(s => s.name.includes(selectedDefaultService));
       if (found) defaultPrice = found.price;
    }

    setServices([
      ...services,
      { 
        id: Date.now(), 
        name: finalName, 
        date: popupServiceDate || bookingDate, 
        qty: popupServiceQty ? Number(popupServiceQty) : 1, 
        price: defaultPrice 
      },
    ]);
    setShowAddPopup(false);
    setSelectedDefaultService("Bridal Makeup");
    setCustomServiceName("");
    setIncludeHairstyle(true);
    setIncludeLens(true);
    setIncludeLashes(true);
    setPopupServiceDate(bookingDate);
    setPopupServiceQty(1);
  };

  const removeRow = (id: number): void => {
    setServices(services.filter((s) => s.id !== id));
  };

  const generatePDF = (): void => {
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
    // "ANJALI" — large bold italic serif in pink (like the brand image)
    // "MAKEOVER" — bold condensed helvetica in black
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

    // Draw MAKEOVER — aligned right next to ANJALI
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
    doc.text(`   M/s/Mr. ${client}`, marginL + doc.getTextWidth("Client:"), y);

    const yPhone = y + 6;
    doc.setFont("helvetica", "bold");
    doc.text("Phn No.:", marginL, yPhone);
    doc.setFont("helvetica", "normal");
    doc.text(`   ${phone || "—"}`, marginL + doc.getTextWidth("Phn No.:"), yPhone);

    // Date + Venue right side
    const rightX = pageW - marginR;
    const dateLabel = "Date:";
    const dateVal = `  ${formatDisplayDate(bookingDate)}`;
    const venueLabel = "Venue:";
    const venueVal = `  ${venue || "—"}`;

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

    // Top table rule
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

    // Header bottom rule
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);

    // Service rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    services.forEach((s: Service) => {
      y += rowH;
      doc.text(s.name, colService, y);
      doc.text(formatDisplayDate(s.date || bookingDate), colDate, y);
      doc.text(String(s.qty ?? 1), colQty, y, { align: "right" });
      doc.text(Number(s.price).toLocaleString("en-IN"), colPrice, y, {
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
    doc.text(String(totalQty), colQty, y, { align: "right" });
    doc.text(totalAmount.toLocaleString("en-IN"), colPrice, y, {
      align: "right",
    });

    // Table bottom rule
    y += 3;
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);

    // ── PAYMENT SUMMARY (right-aligned) ────────────────────
    y += 14;
    const sumLabelX = pageW - marginR - 58;
    const sumValueX = pageW - marginR;

    const drawSumRow = (label: string, value: string, bold: boolean): void => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(10);
      doc.setTextColor(...black);
      doc.text(label, sumLabelX, y);
      doc.text(value, sumValueX, y, { align: "right" });
      y += 8;
    };

    drawSumRow("Total Amount:", totalAmount.toLocaleString("en-IN"), false);
    drawSumRow("Advance Paid:", Number(advance).toLocaleString("en-IN"), false);
    if (includeTravel) {
      drawSumRow("Travel Charges:", effectiveTravel.toLocaleString("en-IN"), false);
    }

    // Rule above Balance Due
    doc.setDrawColor(...black);
    doc.setLineWidth(0.3);
    doc.line(sumLabelX, y - 4, sumValueX, y - 4);

    // Balance Due — large bold
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

    const slug = (client || "invoice")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase()
      .slice(0, 40);
    doc.save(`anjali_makeover_invoice_${slug}.pdf`);
  };

  const handleOpenSubmit = () => {
    const { errors, errorList: list } = validateForm();
    setFormErrors(errors);
    setErrorList(list);
    setHasAttemptedSubmit(true);

    if (list.length > 0) {
      setEditing(true);
      if (invoiceRef.current) {
        invoiceRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    setShowSubmitPopup(true);
  };

  const handleSubmitAction = async () => {
    const { errors, errorList: list } = validateForm();
    if (list.length > 0) {
      setFormErrors(errors);
      setErrorList(list);
      setHasAttemptedSubmit(true);
      setEditing(true);
      setShowSubmitPopup(false);
      if (invoiceRef.current) {
        invoiceRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    setIsSaving(true);
    try {
      if (updateList) {
        await fetch('/api/makeup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: client || "Unknown Client",
            phone: phone || "",
            email: "",
            bookingDate: bookingDate,
            advance: Number(advance) || 0,
            totalPrice: totalAmount,
            venue: venue,
            services: services.map(s => ({
              name: s.name,
              date: s.date || bookingDate,
              qty: Number(s.qty) || 1,
              price: Number(s.price) || 0
            })),
            noOfServices: totalQty,
            travelAmount: effectiveTravel
          })
        });
      }
      generatePDF();
      setShowSubmitPopup(false);
    } catch (err) {
      console.error("Error submitting invoice:", err);
      generatePDF();
      setShowSubmitPopup(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="app-wrapper">
        <p className="app-title-bar">
          <span className="app-title-main">Anjali Makeover</span>
          <span className="app-title-sub">Invoice Generator</span>
          <span className="app-title-rule" />
        </p>

        <div className="controls">
          <button className="btn btn-edit" onClick={() => setEditing(!editing)}>
            {editing ? "✓ Done Editing" : "✎ Edit Invoice"}
          </button>
          <button className="btn btn-download" onClick={handleOpenSubmit}>
            Submit
          </button>
        </div>

        {showAddPopup && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 1000,
            padding: "16px"
          }}>
            <div style={{
              background: "#ffffff", padding: "24px 20px", borderRadius: "10px",
              width: "100%", maxWidth: "400px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              display: "flex", flexDirection: "column", gap: "16px",
              fontFamily: "'Helvetica Neue', sans-serif", color: "#1a1a1a"
            }}>
              <h3 style={{ margin: 0, color: "#1a1a1a", fontSize: "20px", fontWeight: 700, textAlign: "center" }}>
                Add New Service
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>Service Name</label>
                <select 
                  value={selectedDefaultService} 
                  onChange={(e) => setSelectedDefaultService(e.target.value)}
                  style={{
                    padding: "10px 12px", borderRadius: "6px", border: "1px solid #d4a574",
                    fontSize: "15px", background: "#ffffff", color: "#1a1a1a",
                    outline: "none", width: "100%", boxSizing: "border-box"
                  }}
                >
                  {serviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {selectedDefaultService === "Custom" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>Custom Service</label>
                  <input 
                    value={customServiceName} 
                    onChange={(e) => setCustomServiceName(e.target.value)}
                    placeholder="Enter custom service"
                    style={{
                      padding: "10px 12px", borderRadius: "6px", border: "1px solid #d4a574",
                      fontSize: "15px", background: "#ffffff", color: "#1a1a1a",
                      outline: "none", width: "100%", boxSizing: "border-box"
                    }}
                  />
                </div>
              )}

              {popupError && (
                <div style={{
                  background: "#fff5f5",
                  border: "1px solid #f5c2c7",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#842029",
                  fontSize: "13px",
                  fontWeight: 500
                }}>
                  ⚠️ {popupError}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 auto", minWidth: 0 }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>Service Date *</label>
                  <input 
                    type="date"
                    value={popupServiceDate} 
                    onChange={(e) => {
                      setPopupServiceDate(e.target.value);
                      if (popupError.toLowerCase().includes("date")) setPopupError("");
                    }}
                    style={{
                      padding: "9px 10px", borderRadius: "6px",
                      border: popupError.toLowerCase().includes("date") ? "1px solid #cc5555" : "1px solid #d4a574",
                      background: popupError.toLowerCase().includes("date") ? "#fff8f8" : "#ffffff",
                      fontSize: "14px", color: "#1a1a1a",
                      outline: "none", width: "100%", boxSizing: "border-box"
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "95px", flexShrink: 0 }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#333", textAlign: "center" }}>Qty *</label>
                  <input 
                    type="number"
                    min={1}
                    value={popupServiceQty} 
                    onChange={(e) => {
                      setPopupServiceQty(e.target.value === "" ? ("" as unknown as number) : Number(e.target.value));
                      if (popupError.toLowerCase().includes("quantity")) setPopupError("");
                    }}
                    style={{
                      padding: "9px 8px", borderRadius: "6px",
                      border: popupError.toLowerCase().includes("quantity") ? "1px solid #cc5555" : "1px solid #d4a574",
                      background: popupError.toLowerCase().includes("quantity") ? "#fff8f8" : "#ffffff",
                      fontSize: "15px", color: "#1a1a1a",
                      outline: "none", width: "100%", boxSizing: "border-box", textAlign: "center"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#666" }}>Add-on Options:</span>
                
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input 
                    type="checkbox" 
                    id="includeHairstyle"
                    checked={includeHairstyle} 
                    onChange={(e) => setIncludeHairstyle(e.target.checked)} 
                    style={{ cursor: "pointer", width: "18px", height: "18px", accentColor: "#e0206a" }}
                  />
                  <label htmlFor="includeHairstyle" style={{ fontSize: "14px", cursor: "pointer", color: "#1a1a1a" }}>Include Hairstyle (+ Hairstyle)</label>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input 
                    type="checkbox" 
                    id="includeLens"
                    checked={includeLens} 
                    onChange={(e) => setIncludeLens(e.target.checked)} 
                    style={{ cursor: "pointer", width: "18px", height: "18px", accentColor: "#e0206a" }}
                  />
                  <label htmlFor="includeLens" style={{ fontSize: "14px", cursor: "pointer", color: "#1a1a1a" }}>Include Lens (+ Lens)</label>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input 
                    type="checkbox" 
                    id="includeLashes"
                    checked={includeLashes} 
                    onChange={(e) => setIncludeLashes(e.target.checked)} 
                    style={{ cursor: "pointer", width: "18px", height: "18px", accentColor: "#e0206a" }}
                  />
                  <label htmlFor="includeLashes" style={{ fontSize: "14px", cursor: "pointer", color: "#1a1a1a" }}>Include Lashes (+ Lashes)</label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button 
                  onClick={() => {
                    setShowAddPopup(false);
                    setPopupError("");
                    setSelectedDefaultService("Bridal Makeup");
                    setIncludeHairstyle(true);
                    setIncludeLens(true);
                    setIncludeLashes(true);
                    setCustomServiceName("");
                    setPopupServiceDate(bookingDate);
                    setPopupServiceQty(1);
                  }}
                  style={{ padding: "9px 20px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", color: "#1a1a1a", fontSize: "14px", fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddServiceSubmit}
                  style={{ padding: "9px 22px", background: "#e0206a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showSubmitPopup && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 1000
          }}>
            <div style={{
              background: "#fff", padding: "24px", borderRadius: "8px",
              width: "90%", maxWidth: "420px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "flex", flexDirection: "column", gap: "16px",
              fontFamily: "'Helvetica Neue', sans-serif", color: "#1a1a1a"
            }}>
              <h3 style={{ margin: 0, color: "#1a1a1a", fontSize: "18px", fontWeight: 600 }}>Submit Invoice</h3>
              
              <p style={{ margin: 0, fontSize: "14px", color: "#666", lineHeight: 1.5 }}>
                Ready to submit invoice for <strong>{client || "Client"}</strong> (₹{grandTotal.toLocaleString("en-IN")})?
              </p>

              <div style={{
                background: "#fdf8fa", border: "1px solid #f3d4e0", borderRadius: "6px",
                padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px"
              }}>
                <input 
                  type="checkbox" 
                  id="updateListCheckbox"
                  checked={updateList} 
                  onChange={(e) => setUpdateList(e.target.checked)} 
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#e0206a" }}
                />
                <label htmlFor="updateListCheckbox" style={{ fontSize: "14px", cursor: "pointer", fontWeight: 500, color: "#1a1a1a" }}>
                  Update list
                  <span style={{ display: "block", fontSize: "12px", color: "#777", fontWeight: "normal", marginTop: "2px" }}>
                    Save booking data into the Makeup Data List
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button 
                  onClick={() => setShowSubmitPopup(false)}
                  disabled={isSaving}
                  style={{ padding: "8px 16px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", color: "#1a1a1a", fontSize: "14px" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitAction}
                  disabled={isSaving}
                  style={{
                    padding: "8px 20px", background: "#e0206a", color: "#fff", border: "none",
                    borderRadius: "4px", cursor: isSaving ? "not-allowed" : "pointer",
                    fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px"
                  }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {editing && <p className="edit-hint">Click any field to edit it</p>}

        <div className="invoice-card" ref={invoiceRef}>
          {/* ── HEADER ── */}
          <div className="inv-header">
            <span className="inv-header-ornament">
              ✦ &nbsp; Bridal &amp; Beauty Artistry &nbsp; ✦
            </span>
            <span className="inv-brand">
              <span className="inv-brand-highlight">Anjali </span>
              <span className="inv-brand-dark">MAKEOVER</span>
            </span>
            <span className="inv-brand-tagline">
              Est. Beauty Studio · Premium Services
            </span>
            <div className="inv-header-rule-wrap">
              <div className="inv-header-rule" />
              <div className="inv-header-diamond" />
              <div className="inv-header-rule" />
            </div>
          </div>

          {/* ── VALIDATION ERROR BANNER ── */}
          {hasAttemptedSubmit && errorList.length > 0 && (
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #f5c2c7",
                borderRadius: "6px",
                padding: "12px 16px",
                margin: "16px 0 20px",
                color: "#842029",
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: "13px",
                lineHeight: "1.5",
                boxShadow: "0 2px 8px rgba(204,85,85,0.08)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, marginBottom: "4px" }}>
                <span style={{ fontSize: "16px" }}>⚠️</span>
                <span>Please fix the following before submitting:</span>
              </div>
              <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
                {errorList.map((err, idx) => (
                  <li key={idx} style={{ marginBottom: "2px" }}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── META ── */}
          <div className="inv-meta">
            <div className="inv-meta-row">
              <span className="inv-meta-label">
                Client {editing && <span style={{ color: "#cc5555" }}>*</span>}
              </span>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '6px', color: '#666', fontFamily: "'Helvetica Neue', sans-serif" }}>M/s/Mr.</span>
                    <input
                      className={`editable-meta ${formErrors.client ? "input-error-border" : ""}`}
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      placeholder="Client name"
                    />
                  </div>
                  {formErrors.client && (
                    <span className="error-hint">
                      {formErrors.client}
                    </span>
                  )}
                </div>
              ) : (
                <span className="inv-meta-value">M/s/Mr. {client || "—"}</span>
              )}
            </div>

            <div className="inv-meta-row">
              <span className="inv-meta-label">
                Date {editing && <span style={{ color: "#cc5555" }}>*</span>}
              </span>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <input
                    className={`date-picker-input ${formErrors.bookingDate ? "input-error-border" : ""}`}
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    title="Click to select date"
                  />
                  {formErrors.bookingDate && (
                    <span className="error-hint">
                      {formErrors.bookingDate}
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className="inv-meta-value"
                  onClick={() => setEditing(true)}
                  style={{ cursor: "pointer" }}
                  title="Click to edit date"
                >
                  {formatDisplayDate(bookingDate)}
                </span>
              )}
            </div>

            <div className="inv-meta-row">
              <span className="inv-meta-label">
                Phn No. {editing && <span style={{ color: "#cc5555" }}>* (10 digits)</span>}
              </span>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <input
                    className={`editable-meta ${formErrors.phone ? "input-error-border" : ""}`}
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Enter 10-digit number"
                  />
                  {formErrors.phone && (
                    <span className="error-hint">
                      {formErrors.phone}
                    </span>
                  )}
                </div>
              ) : (
                <span className="inv-meta-value">{phone || "—"}</span>
              )}
            </div>

            <div className="inv-meta-row">
              <span className="inv-meta-label">Venue</span>
              {editing ? (
                <input
                  className="editable-meta"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. KK Palace, Khurai, MP"
                />
              ) : (
                <span className="inv-meta-value">{venue || "—"}</span>
              )}
            </div>
          </div>

          {/* ── SERVICES ── */}
          <div className="section-title">
            Services
            <span className="section-title-rule" />
          </div>
          <div style={{ overflowX: "auto", margin: "0 -8px", padding: "0 8px" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th className="col-service">Service Category</th>
                  <th className="col-date">Date</th>
                  <th className="col-qty">Qty</th>
                  <th className="col-price">Total Price</th>
                </tr>
              </thead>
            <tbody>
              {services.map((row: Service) => (
                <tr key={row.id}>
                  <td className="col-service">
                    {editing ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          className="btn-remove"
                          onClick={() => removeRow(row.id)}
                          title="Remove"
                        >
                          ×
                        </button>
                        <input
                          className="editable-input"
                          value={row.name}
                          onChange={(e) =>
                            handleServiceChange(row.id, "name", e.target.value)
                          }
                          placeholder="Service name"
                          style={{ minWidth: 0, flex: 1 }}
                        />
                      </span>
                    ) : (
                      row.name
                    )}
                  </td>
                  <td className="col-date">
                    {editing ? (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <input
                          className={`service-date-input ${formErrors.services?.[row.id]?.date ? "input-error-border" : ""}`}
                          type="date"
                          value={row.date || ""}
                          onChange={(e) =>
                            handleServiceChange(row.id, "date", e.target.value)
                          }
                          onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                          title="Click to select date"
                        />
                        {formErrors.services?.[row.id]?.date && (
                          <span className="error-hint">
                            {formErrors.services[row.id].date}
                          </span>
                        )}
                      </div>
                    ) : (
                      formatDisplayDate(row.date)
                    )}
                  </td>
                  <td className="col-qty">
                    {editing ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <input
                          className={`editable-input qty-input ${formErrors.services?.[row.id]?.qty ? "input-error-border" : ""}`}
                          type="number"
                          min={1}
                          value={row.qty}
                          onChange={(e) =>
                            handleServiceChange(
                              row.id,
                              "qty",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                        {formErrors.services?.[row.id]?.qty && (
                          <span className="error-hint" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>
                            &gt; 0
                          </span>
                        )}
                      </div>
                    ) : (
                      row.qty ?? 1
                    )}
                  </td>
                  <td className="col-price">
                    {editing ? (
                      <input
                        className="editable-input right"
                        type="number"
                        placeholder="0"
                        value={row.price === 0 ? "" : row.price}
                        onChange={(e) =>
                          handleServiceChange(
                            row.id,
                            "price",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        style={{ width: "70px" }}
                      />
                    ) : (
                      Number(row.price).toLocaleString("en-IN")
                    )}
                  </td>
                </tr>
              ))}
              {editing && (
                <tr>
                  <td colSpan={4} style={{ paddingTop: 8 }}>
                    <button className="btn btn-add" onClick={openAddPopup}>
                      + Add Service
                    </button>
                  </td>
                </tr>
              )}
              <tr className="total-row">
                <td colSpan={2} className="col-service">TOTAL SERVICE COUNT</td>
                <td className="col-qty">{totalQty}</td>
                <td className="col-price">{totalAmount.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
            </table>
          </div>

          {/* ── SUMMARY ── */}
          <div className="inv-summary">
            <table className="summary-table">
              <tbody>
                <tr>
                  <td className="summary-label">Total Amount:</td>
                  <td>{totalAmount.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td className="summary-label">Advance Paid:</td>
                  <td>
                    {editing ? (
                      <input
                        className="editable-input right"
                        type="number"
                        placeholder="0"
                        value={advance === 0 ? "" : advance}
                        onChange={(e) => setAdvance(e.target.value === "" ? 0 : Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                    ) : (
                      Number(advance).toLocaleString("en-IN")
                    )}
                  </td>
                </tr>
                <tr style={{ transition: "opacity 0.2s ease" }}>
                  <td className="summary-label" style={{ verticalAlign: "middle" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      {editing && (
                        <input
                          type="checkbox"
                          id="includeTravelCheckbox"
                          checked={includeTravel}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIncludeTravel(checked);
                            if (checked) {
                              setTimeout(() => {
                                travelInputRef.current?.focus();
                                travelInputRef.current?.select();
                              }, 50);
                            }
                          }}
                          style={{
                            cursor: "pointer",
                            width: "16px",
                            height: "16px",
                            accentColor: "#e0206a",
                            margin: 0
                          }}
                        />
                      )}
                      <label 
                        htmlFor="includeTravelCheckbox" 
                        style={{ 
                          cursor: editing ? "pointer" : "default",
                          color: includeTravel ? "#1a1a1a" : "#888",
                          transition: "color 0.2s ease",
                          userSelect: "none"
                        }}
                      >
                        Travel Charges:
                      </label>
                    </div>
                  </td>
                  <td>
                    {editing ? (
                      <input
                        ref={travelInputRef}
                        className="editable-input right"
                        type="number"
                        min={0}
                        placeholder="0"
                        disabled={!includeTravel}
                        value={!includeTravel ? 0 : (travelAmount === 0 ? "" : travelAmount)}
                        onChange={(e) => setTravelAmount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                        style={{
                          width: 80,
                          opacity: includeTravel ? 1 : 0.35,
                          background: includeTravel ? "#fffdf8" : "#ede8df",
                          borderBottom: includeTravel ? "1px dashed #d4a574" : "1px dashed #ccc",
                          color: includeTravel ? "#1a1a1a" : "#999",
                          cursor: includeTravel ? "text" : "not-allowed",
                          pointerEvents: includeTravel ? "auto" : "none",
                          transition: "all 0.2s ease"
                        }}
                      />
                    ) : (
                      <span style={{ color: includeTravel ? "#1a1a1a" : "#999", opacity: includeTravel ? 1 : 0.5 }}>
                        {effectiveTravel.toLocaleString("en-IN")}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <hr className="summary-divider" style={{ width: 280 }} />
            <table className="summary-table">
              <tbody>
                <tr className="summary-balance">
                  <td className="summary-label">Balance Due:</td>
                  <td>{balance.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── THANK YOU ── */}
          <div className="inv-thankyou">Thank you for your business!</div>

          {/* ── FOOTER ── */}
          <div className="inv-footer">
            <span>
              <strong>Visit our Website:</strong>{" "}
              <a
                className="link"
                href="https://www.anjalimakeover.co.in"
                target="_blank"
                rel="noreferrer"
              >
                www.anjalimakeover.co.in
              </a>
            </span>
            <span>
              <strong>Leave us a Review:</strong>{" "}
              <a
                className="link"
                href="https://g.page/r/CX9fivISCCmvEBM/review"
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
