import { useState, useEffect, useRef, useCallback } from 'react';
import './Template.css';
import { generateMakeupPDF } from '../utils/pdfGenerator.js';
import { formatDisplayDate } from '../utils/dateFormat.js';

export interface ServiceItem {
  name: string;
  price: number | "";
  qty?: string | number;
  date?: string;
}

export interface MakeupRecord {
  id: number;
  clientName: string;
  bookingDate: string;
  advance: number;
  totalPrice: number;
  venue: string;
  phone?: string;
  email?: string;
  services: string | ServiceItem[];
  noOfServices: number;
  travelAmount: number;
}

const parseServices = (raw: unknown): ServiceItem[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => {
      if (typeof s === 'string') {
        return { name: s, price: "", qty: 1, date: "" };
      }
      const rawQty = s.qty !== undefined && s.qty !== null ? s.qty : 1;
      const numQty = typeof rawQty === 'number' ? rawQty : parseInt(String(rawQty));
      return {
        name: s.name || '',
        price: s.price === 0 || s.price === "" ? "" : Number(s.price),
        qty: isNaN(numQty) ? 1 : numQty,
        date: s.date || '',
      };
    });
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => {
            if (typeof s === 'string') {
              return { name: s, price: "", qty: 1, date: "" };
            }
            const rawQty = s.qty !== undefined && s.qty !== null ? s.qty : 1;
            const numQty = typeof rawQty === 'number' ? rawQty : parseInt(String(rawQty));
            return {
              name: s.name || '',
              price: s.price === 0 || s.price === "" ? "" : Number(s.price),
              qty: isNaN(numQty) ? 1 : numQty,
              date: s.date || '',
            };
          });
        }
      } catch {
        // fall through to comma separated
      }
    }
    // Older legacy string format: "Basic Makeup, HD Makeup"
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        price: "", // empty so it shows placeholder 0
        qty: 1,
        date: "",
      }));
  }
  return [];
};

const serviceOptions = [
  "Bridal Makeup", "Bride Phere Makeup", "Haldi Makeup", "Engagement Makeup",
  "Sangeet Makeup", "Basic Makeup", "Groom Makeup", "Nude/Basic Makeup",
  "Matte Makeup", "HD Makeup", "Dewy Makeup", "Airbrush Makeup",
  "Sweat Proof Makeup", "3D Makeup", "No Makeup Look", "Glossy Makeup",
  "Dramatic Makeup", "Custom"
];

const defaultServicePrices: Record<string, number> = {
  "Bridal Makeup": 10000,
  "Bride Phere Makeup": 8000,
  "Haldi Makeup": 5000,
  "Engagement Makeup": 8000,
  "Sangeet Makeup": 6000,
  "Basic Makeup": 3000,
  "Groom Makeup": 3000,
  "Nude/Basic Makeup": 4000,
  "Matte Makeup": 5000,
  "HD Makeup": 8000,
  "Dewy Makeup": 7000,
  "Airbrush Makeup": 12000,
  "Sweat Proof Makeup": 2000,
  "3D Makeup": 9000,
  "No Makeup Look": 4000,
  "Glossy Makeup": 6000,
  "Dramatic Makeup": 7000,
};

export default function MakeupData() {
  const [data, setData] = useState<MakeupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/makeup').catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        // Mock data fallback if DB fails
        setData([
          { id: 1, clientName: "Priya Sharma", bookingDate: "2026-06-15", advance: 2000, totalPrice: 15000, venue: "Grand Hyatt", services: JSON.stringify([{ name: "Bridal Makeup", date: "2026-06-15", price: 15000, qty: 1 }]), noOfServices: 1, travelAmount: 500 },
          { id: 2, clientName: "Neha Gupta", bookingDate: "2026-06-18", advance: 1500, totalPrice: 12000, venue: "Taj Palace", services: JSON.stringify([{ name: "Engagement Makeup", date: "2026-06-18", price: 8000, qty: 1 }, { name: "Sider Makeup", date: "2026-06-18", price: 4000, qty: 1 }]), noOfServices: 2, travelAmount: 0 }
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newBookingDate, setNewBookingDate] = useState("");
  const [newAdvance, setNewAdvance] = useState<number | "">("");
  const [newTotalPrice, setNewTotalPrice] = useState<number | "">("");
  const [newVenue, setNewVenue] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newServices, setNewServices] = useState<ServiceItem[]>([]);
  const [selectedServiceOption, setSelectedServiceOption] = useState<string>("");
  const [newServicePrice, setNewServicePrice] = useState<number | "">("");
  const [customServiceName, setCustomServiceName] = useState<string>("");
  const [includeHairstyle, setIncludeHairstyle] = useState<boolean>(true);
  const [includeLens, setIncludeLens] = useState<boolean>(true);
  const [includeLashes, setIncludeLashes] = useState<boolean>(true);
  const [newTravelAmount, setNewTravelAmount] = useState<number | "">("");

  const [newServiceDate, setNewServiceDate] = useState<string>("");
  const [newServiceQty, setNewServiceQty] = useState<number>(1);
  const [serviceAddError, setServiceAddError] = useState<string>("");

  // Validation State (Matching Anjali Makeover & Calendar forms)
  const [modalErrors, setModalErrors] = useState<{ client?: string; bookingDate?: string; phone?: string; services?: string }>({});
  const [modalErrorList, setModalErrorList] = useState<string[]>([]);
  const [modalHasSubmitted, setModalHasSubmitted] = useState<boolean>(false);
  const modalBoxRef = useRef<HTMLDivElement>(null);
  
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'edit' | 'delete', recordId: number, record?: MakeupRecord } | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MakeupRecord | null>(null);
  const [showAllServices, setShowAllServices] = useState<boolean>(false);

  useEffect(() => {
    setShowAllServices(false);
  }, [viewingRecord?.id]);

  useEffect(() => {
    if (viewingRecord || showAddPopup || confirmAction) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [viewingRecord, showAddPopup, confirmAction]);

  // Validation (Matching Anjali Makeover form rules)
  // - Client name is required
  // - Date is required
  // - Phone no. is required and 10 digits only
  // - Quantity greater than 0 and date of every service required
  // Without this validation form cannot be submitted
  const validateModalForm = useCallback((
    cName = newClientName,
    bDate = newBookingDate,
    ph = newPhone,
    svcs = newServices
  ): { errors: { client?: string; bookingDate?: string; phone?: string; services?: string }; list: string[] } => {
    const errs: { client?: string; bookingDate?: string; phone?: string; services?: string } = {};
    const list: string[] = [];

    // 1. Client name is required
    if (!cName || !cName.trim()) {
      errs.client = "Client name is required";
      list.push("Client name is required");
    }

    // 2. Date is required
    if (!bDate || !bDate.trim()) {
      errs.bookingDate = "Date is required";
      list.push("Date is required");
    }

    // 3. Phone no. is required and 10 digits only
    const digitsOnly = (ph || "").replace(/\D/g, "");
    if (!ph || !ph.trim()) {
      errs.phone = "Phone number is required (10 digits)";
      list.push("Phone number is required (10 digits)");
    } else if (digitsOnly.length !== 10) {
      errs.phone = "Phone number must be exactly 10 digits";
      list.push("Phone number must be exactly 10 digits");
    }

    // 4. Quantity greater than 0 and date of every service required
    if (!svcs || svcs.length === 0) {
      errs.services = "At least one service is required";
      list.push("At least one service is required");
    } else {
      let hasDateErr = false;
      let hasQtyErr = false;

      svcs.forEach((s) => {
        if (!s.date || !s.date.trim()) {
          hasDateErr = true;
        }
        const q = typeof s.qty === "number" ? s.qty : Number(s.qty);
        if (s.qty === "" || isNaN(q) || q <= 0) {
          hasQtyErr = true;
        }
      });

      if (hasDateErr) {
        errs.services = "Date is required for every service";
        list.push("Date is required for every service");
      }
      if (hasQtyErr) {
        if (!errs.services) errs.services = "Quantity must be greater than 0 for every service";
        list.push("Quantity must be greater than 0 for every service");
      }
    }

    return { errors: errs, list };
  }, [newClientName, newBookingDate, newPhone, newServices]);

  // Live validation updates after first submit attempt
  useEffect(() => {
    if (modalHasSubmitted) {
      const { errors, list } = validateModalForm();
      setModalErrors(errors);
      setModalErrorList(list);
    }
  }, [modalHasSubmitted, validateModalForm]);

  const resetForm = () => {
    setEditingId(null);
    setNewClientName("");
    setNewBookingDate("");
    setNewAdvance("");
    setNewTotalPrice("");
    setNewVenue("");
    setNewPhone("");
    setNewEmail("");
    setNewServices([]);
    setSelectedServiceOption("");
    setNewServicePrice("");
    setCustomServiceName("");
    setIncludeHairstyle(true);
    setIncludeLens(true);
    setIncludeLashes(true);
    setNewTravelAmount("");
    setNewServiceDate("");
    setNewServiceQty(1);
    setServiceAddError("");
    setModalErrors({});
    setModalErrorList([]);
    setModalHasSubmitted(false);
  };

  const handleSubmit = async () => {
    const { errors, list } = validateModalForm();
    setModalErrors(errors);
    setModalErrorList(list);
    setModalHasSubmitted(true);

    if (list.length > 0) {
      if (modalBoxRef.current) {
        modalBoxRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    
    const payload = {
      clientName: newClientName.trim(),
      phone: newPhone.replace(/\D/g, "").slice(0, 10),
      email: newEmail.trim(),
      bookingDate: newBookingDate.trim(),
      advance: Number(newAdvance) || 0,
      totalPrice: Number(newTotalPrice) || 0,
      venue: newVenue.trim(),
      services: JSON.stringify(newServices.map(s => ({
        name: s.name,
        date: s.date || newBookingDate.trim(),
        qty: Number(s.qty) || 1,
        price: Number(s.price) || 0
      }))),
      noOfServices: newServices.length || 1,
      travelAmount: Number(newTravelAmount) || 0
    };

    if (editingId) {
      try {
        const res = await fetch('/api/makeup', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload })
        });
        if (res.ok) {
          const updatedRecord = await res.json();
          setData(data.map(record => record.id === editingId ? updatedRecord : record));
        } else {
          setData(data.map(record => record.id === editingId ? { ...record, ...payload } : record));
        }
      } catch {
        setData(data.map(record => record.id === editingId ? { ...record, ...payload } : record));
      }
    } else {
      try {
        const res = await fetch('/api/makeup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const newRecord = await res.json();
          setData([newRecord, ...data]);
        } else {
          setData([{ id: Date.now(), ...payload } as MakeupRecord, ...data]);
        }
      } catch {
        setData([{ id: Date.now(), ...payload } as MakeupRecord, ...data]);
      }
    }
    
    setShowAddPopup(false);
    resetForm();
  };

  const handleAddServiceItem = () => {
    if (!selectedServiceOption) {
      setServiceAddError("Please select a service name.");
      return;
    }
    const sName = selectedServiceOption === "Custom" ? customServiceName.trim() : selectedServiceOption.trim();
    if (!sName) {
      setServiceAddError("Please enter custom service name.");
      return;
    }

    const sDate = (newServiceDate || newBookingDate || new Date().toISOString().split("T")[0]).trim();
    if (!sDate) {
      setServiceAddError("Service date is required.");
      return;
    }

    const sQty = Number(newServiceQty);
    if (!newServiceQty || isNaN(sQty) || sQty <= 0) {
      setServiceAddError("Quantity must be greater than 0.");
      return;
    }

    setServiceAddError("");

    let finalName = sName;
    const addOns: string[] = [];
    if (includeHairstyle && !finalName.toLowerCase().includes("hairstyle")) addOns.push("Hairstyle");
    if (includeLens && !finalName.toLowerCase().includes("lens")) addOns.push("Lens");
    if (includeLashes && !finalName.toLowerCase().includes("lashes")) addOns.push("Lashes");
    if (addOns.length > 0) finalName += " + " + addOns.join(" + ");

    const sPrice: number | "" = newServicePrice === "" ? 0 : Number(newServicePrice);
    const newItem: ServiceItem = { name: finalName, date: sDate, price: sPrice, qty: sQty };
    const updated = [...newServices, newItem];
    setNewServices(updated);

    const newTotal = updated.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    setNewTotalPrice(newTotal === 0 ? "" : newTotal);

    setSelectedServiceOption("");
    setNewServicePrice("");
    setCustomServiceName("");
    setNewServiceQty(1);
    setIncludeHairstyle(true);
    setIncludeLens(true);
    setIncludeLashes(true);
  };

  const handleRemoveServiceItem = (idx: number) => {
    const updated = newServices.filter((_, i) => i !== idx);
    setNewServices(updated);
    const newTotal = updated.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    setNewTotalPrice(newTotal === 0 ? "" : newTotal);
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    
    if (confirmAction.type === 'edit') {
      const record = confirmAction.record!;
      setEditingId(record.id);
      setNewClientName(record.clientName);
      setNewBookingDate(record.bookingDate);
      setNewAdvance(record.advance === 0 ? "" : record.advance);
      setNewTotalPrice(record.totalPrice === 0 ? "" : record.totalPrice);
      setNewVenue(record.venue || "");
      setNewPhone(record.phone || "");
      setNewEmail(record.email || "");
      const parsedServices = parseServices(record.services);
      setNewServices(parsedServices);
      setNewTravelAmount(record.travelAmount === 0 ? "" : (record.travelAmount || ""));
      setNewServiceDate(record.bookingDate || new Date().toISOString().split("T")[0]);
      setNewServiceQty(1);
      setIncludeHairstyle(true);
      setIncludeLens(true);
      setIncludeLashes(true);
      setServiceAddError("");
      setModalErrors({});
      setModalErrorList([]);
      setModalHasSubmitted(false);
      setShowAddPopup(true);
    } else if (confirmAction.type === 'delete') {
      const id = confirmAction.recordId;
      try {
        await fetch(`/api/makeup?id=${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error(err);
      }
      setData(data.filter(r => r.id !== id));
    }
    setConfirmAction(null);
  };

  const handlePaymentSettled = async (record: MakeupRecord) => {
    const fullAmount = record.totalPrice + (record.travelAmount || 0);
    const payload = {
      ...record,
      services: typeof record.services === 'object' ? JSON.stringify(record.services) : record.services,
      advance: fullAmount
    };

    try {
      const res = await fetch('/api/makeup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedRecord = await res.json();
        setData(data.map(r => r.id === record.id ? updatedRecord : r));
        setViewingRecord(updatedRecord);
      } else {
        setData(data.map(r => r.id === record.id ? payload : r));
        setViewingRecord(payload);
      }
    } catch {
      setData(data.map(r => r.id === record.id ? payload : r));
      setViewingRecord(payload);
    }
  };

  const filteredData = data.filter(record => 
    record.clientName.toLowerCase().includes(search.toLowerCase()) ||
    (record.venue && record.venue.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

  const totalBookings = data.length;
  const totalAmount = data.reduce((sum, r) => sum + r.totalPrice + (r.travelAmount || 0), 0);
  const totalPending = data.reduce((sum, r) => sum + Math.max(0, (r.totalPrice + (r.travelAmount || 0)) - r.advance), 0);
  const totalMoney = totalAmount - totalPending;

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", fontFamily: "'Cinzel', serif", color: "#a27022" }}>Loading Makeup Data...</div>;
  }

  return (
    <div className="cd-container">
      <style>{`
        .cd-container { padding: 24px; max-width: 1000px; margin: 0 auto; font-family: 'EB Garamond', serif; }
        .cd-header { text-align: center; margin-bottom: 32px; }
        .cd-title { font-family: 'Cinzel', serif; color: #a27022; font-size: 32px; margin: 0; }
        .cd-subtitle { color: #666; font-style: italic; margin-top: 8px; }
        
        .cd-controls { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: center; flex-wrap: wrap; gap: 12px; }
        .cd-search { padding: 10px 16px; width: 100%; max-width: 350px; border-radius: 4px; border: 1px solid #c4a060; font-family: 'EB Garamond', serif; font-size: 16px; background: #fff; color: #1a1a1a; }
        .cd-btn-add { padding: 10px 20px; background: #a27022; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Cinzel', serif; font-weight: 600; white-space: nowrap; }
        
        .cd-table-wrap { overflow-x: auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; }
        .cd-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .cd-table th { padding: 16px; text-align: left; font-family: 'Cinzel', serif; color: #1a1a1a; }
        .cd-table td { padding: 16px; color: #555; }
        .cd-table tr { border-bottom: 1px solid #eee; }
        .cd-form-row { display: flex; gap: 12px; }
        .cd-form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        
        .cd-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(0,0,0,0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: 16px;
        }
        .cd-modal-box {
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #c4a060;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          padding: 24px;
          width: 100%;
          max-width: 520px;
          max-height: 92vh;
          overflow-y: auto;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          gap: 14px;
          font-family: 'EB Garamond', serif;
          color: #1a1a1a;
          box-sizing: border-box;
        }
        .cd-input-field {
          padding: 8px 10px;
          border: 1px solid #c4a060;
          border-radius: 4px;
          font-family: 'EB Garamond', serif;
          font-size: 15px;
          color: #1a1a1a;
          background: #ffffff;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cd-input-field:focus {
          border-color: #a27022;
          box-shadow: 0 0 0 2px rgba(162, 112, 34, 0.2);
        }
        .cd-input-error {
          border-color: #c62828 !important;
          background-color: #feecec !important;
        }
        .cd-input-error:focus {
          box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.2) !important;
        }
        .cd-service-add-card {
          background: #fdfbf7;
          border: 1px solid #c4a060;
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-sizing: border-box;
        }
        .cd-service-item-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          border: 1px solid #e0d5c1;
          border-radius: 4px;
          padding: 8px 10px;
          gap: 8px;
          box-sizing: border-box;
        }
        
        @media (max-width: 768px) {
          .cd-container { padding: 12px 4px; }
          .cd-controls { flex-direction: column; align-items: stretch; padding: 0 8px; }
          .cd-header { padding: 0 8px; }
          .cd-search { max-width: 100%; }
          .cd-btn-add { width: 100%; text-align: center; }
          /* Revert to list-style table for mobile */
          .cd-table-wrap { border-radius: 8px; border: 1px solid #eee; overflow-x: auto; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .cd-table { min-width: 600px; font-size: 14px; }
          .cd-table th, .cd-table td { padding: 10px 8px; }
          
          .cd-modal-box {
            padding: 16px 12px;
            max-height: 94vh;
            gap: 12px;
          }
          .cd-form-row { flex-direction: column; gap: 10px; }
          .cd-form-row-3 {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .cd-form-row-3 > div:last-child {
            grid-column: span 2;
          }
          .cd-service-add-card {
            padding: 10px 8px;
          }
        }

        @media (max-width: 480px) {
          .cd-modal-box {
            padding: 14px 10px;
          }
          .cd-service-item-card {
            padding: 6px 8px;
            font-size: 13px;
          }
        }
      `}</style>
      
      <div className="cd-header">
        <h2 className="cd-title">Makeup Bookings Data</h2>
        <p className="cd-subtitle">Record of clients booking makeup services</p>
      </div>

      <div style={{ marginBottom: "32px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "8px", padding: "24px", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 24px 0", fontFamily: "'Cinzel', serif", color: "#a27022", fontSize: "20px" }}>Revenue Dashboard</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "48px", flexWrap: "wrap" }}>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Bookings</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#a27022" }}>{totalBookings}</p>
          </div>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Amount</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#a27022" }}>₹{totalAmount}</p>
          </div>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Pending</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#cc5555" }}>₹{totalPending}</p>
          </div>
          <div>
            <h4 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: "#666", fontSize: "14px" }}>Total Received Money</h4>
            <p style={{ margin: "4px 0 0", fontSize: "32px", fontWeight: "bold", color: "#a27022" }}>₹{totalMoney}</p>
          </div>
        </div>
      </div>

      <div className="cd-controls">
        <input 
          type="text" 
          placeholder="Search by client or venue..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cd-search"
        />
        <button 
          onClick={() => {
            resetForm();
            const today = new Date().toISOString().split("T")[0];
            setNewBookingDate(today);
            setNewServiceDate(today);
            setShowAddPopup(true);
          }}
          className="cd-btn-add"
        >
          + Add New Booking
        </button>
      </div>

      <div className="cd-table-wrap">
        <table className="cd-table">
          <thead>
            <tr style={{ background: "#fcf9f2", borderBottom: "2px solid #a27022" }}>
              <th style={{ width: "50px" }}>S.No.</th>
              <th>Client Name</th>
              <th>Booking Date</th>
              <th style={{ textAlign: "center" }}>Count</th>
              <th>Total Price</th>
              <th>Pending Amount</th>
              <th style={{ width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((record, index) => {
                const pendingAmount = (record.totalPrice + (record.travelAmount || 0)) - record.advance;
                const isPending = pendingAmount > 0;
                const rowBg = isPending ? "#feecec" : "transparent";
                const hoverBg = isPending ? "#fcdcdc" : "#fafafa";
                return (
                  <tr 
                    key={record.id} 
                    onClick={() => setViewingRecord(record)} 
                    style={{ cursor: "pointer", transition: "background 0.2s", background: rowBg }} 
                    onMouseEnter={e => e.currentTarget.style.background = hoverBg} 
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    <td data-label="S.No." style={{ fontWeight: "bold", color: "#666" }}>{index + 1}</td>
                    <td data-label="Client Name" style={{ fontWeight: 600 }}>{record.clientName}</td>
                    <td data-label="Booking Date">{formatDisplayDate(record.bookingDate)}</td>
                    <td data-label="Count" style={{ textAlign: "center" }}>{record.noOfServices}</td>
                    <td data-label="Total Price" style={{ fontWeight: 600, color: "#1a1a1a" }}>₹{record.totalPrice}</td>
                    <td data-label="Pending Amount" style={{ fontWeight: 600, color: isPending ? "#cc5555" : "#666" }}>₹{pendingAmount}</td>
                    <td className="actions-cell" style={{ position: "relative", textAlign: "center" }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === record.id ? null : record.id); }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px", color: "#a27022" }}
                      >
                        ⋮
                      </button>
                      {activeMenuId === record.id && (
                        <div style={{
                          position: "absolute", right: "24px", top: "40px", background: "#fff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: "4px", zIndex: 10,
                          display: "flex", flexDirection: "column", minWidth: "155px", border: "1px solid #eee"
                        }}>
                          <button onClick={(e) => { e.stopPropagation(); setViewingRecord(record); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", color: "#1a1a1a", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>👁 View Details</button>
                          <button onClick={(e) => { e.stopPropagation(); generateMakeupPDF(record); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", color: "#a27022", fontFamily: "'EB Garamond', serif", fontSize: "15px", fontWeight: 600 }}>📄 Download Invoice</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'edit', recordId: record.id, record }); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", color: "#1a1a1a", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>✎ Edit Item</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', recordId: record.id }); setActiveMenuId(null); }} style={{ padding: "10px 16px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "#cc5555", fontFamily: "'EB Garamond', serif", fontSize: "15px" }}>× Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#999", fontStyle: "italic" }}>
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddPopup && (
        <div className="cd-modal-backdrop" onClick={() => setShowAddPopup(false)}>
          <div className="cd-modal-box" ref={modalBoxRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "#a27022", fontFamily: "'Cinzel', serif", fontSize: "20px", fontWeight: 700 }}>
                {editingId ? "Edit Booking" : "Add New Booking"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPopup(false)}
                style={{ background: "none", border: "none", fontSize: "26px", cursor: "pointer", color: "#999", lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Error Banner when validation fails */}
            {modalHasSubmitted && modalErrorList.length > 0 && (
              <div style={{
                background: "#feecec",
                border: "1px solid #f5c2c7",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#842029",
                fontSize: "13px"
              }}>
                <div style={{ fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>⚠️</span>
                  <span>Please fix the following errors before submitting:</span>
                </div>
                <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                  {modalErrorList.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
              {/* Client Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                  Client Name *
                </label>
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Seeta Patel"
                  className={`cd-input-field ${modalErrors.client ? "cd-input-error" : ""}`}
                />
                {modalErrors.client && (
                  <span style={{ color: "#c62828", fontSize: "12px", marginTop: "2px" }}>
                    {modalErrors.client}
                  </span>
                )}
              </div>

              {/* Booking Date & Phone */}
              <div className="cd-form-row">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                    Booking Date *
                  </label>
                  <input
                    type="date"
                    value={newBookingDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewBookingDate(val);
                      if (!newServiceDate || newServiceDate === newBookingDate) {
                        setNewServiceDate(val);
                      }
                    }}
                    className={`cd-input-field ${modalErrors.bookingDate ? "cd-input-error" : ""}`}
                  />
                  {modalErrors.bookingDate && (
                    <span style={{ color: "#c62828", fontSize: "12px", marginTop: "2px" }}>
                      {modalErrors.bookingDate}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                    Phone No. (10 digits) *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className={`cd-input-field ${modalErrors.phone ? "cd-input-error" : ""}`}
                  />
                  {modalErrors.phone && (
                    <span style={{ color: "#c62828", fontSize: "12px", marginTop: "2px" }}>
                      {modalErrors.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Venue & Email */}
              <div className="cd-form-row">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                    Venue (Optional)
                  </label>
                  <input
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    placeholder="e.g. Grand Hyatt"
                    className="cd-input-field"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="cd-input-field"
                  />
                </div>
              </div>

              {/* Services Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                    Services Taken ({newServices.length}) *
                  </label>
                  {modalErrors.services && (
                    <span style={{ color: "#c62828", fontSize: "12px", fontWeight: 600 }}>
                      ⚠️ {modalErrors.services}
                    </span>
                  )}
                </div>

                {/* Added Services List */}
                {newServices.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto", paddingRight: "2px" }}>
                    {newServices.map((s, idx) => (
                      <div key={idx} className="cd-service-item-card">
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
                          <span style={{ fontWeight: 600, color: "#1a1a1a", wordBreak: "break-word" }}>
                            {s.name}
                          </span>
                          <span style={{ fontSize: "12px", color: "#666" }}>
                            {s.date ? `📅 ${formatDisplayDate(s.date)}` : "⚠️ No date"} • Qty: {s.qty || 1}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <strong style={{ color: "#a27022", fontSize: "14px" }}>
                            ₹{Number(s.price || 0).toLocaleString("en-IN")}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceItem(idx)}
                            style={{
                              background: "#feecec",
                              border: "1px solid #f5c2c7",
                              color: "#c62828",
                              cursor: "pointer",
                              borderRadius: "4px",
                              width: "22px",
                              height: "22px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "15px",
                              fontWeight: "bold",
                              padding: 0
                            }}
                            title="Remove service"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Service Sub-card */}
                <div className="cd-service-add-card">
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#a27022", fontFamily: "'Cinzel', serif" }}>
                    + Add Service Item
                  </span>

                  {serviceAddError && (
                    <div style={{
                      background: "#fff5f5",
                      border: "1px solid #f5c2c7",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      color: "#842029",
                      fontSize: "12px",
                      fontWeight: 500
                    }}>
                      ⚠️ {serviceAddError}
                    </div>
                  )}

                  {/* Service Name Dropdown */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>Service Name</label>
                    <select
                      value={selectedServiceOption}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedServiceOption(val);
                        if (val && val !== "Custom" && newServicePrice === "") {
                          if (defaultServicePrices[val]) {
                            setNewServicePrice(defaultServicePrices[val]);
                          }
                        }
                        if (serviceAddError) setServiceAddError("");
                      }}
                      className="cd-input-field"
                    >
                      <option value="">-- Select Service --</option>
                      {serviceOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {selectedServiceOption === "Custom" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>Custom Service Name</label>
                      <input
                        type="text"
                        placeholder="Enter custom service"
                        value={customServiceName}
                        onChange={(e) => {
                          setCustomServiceName(e.target.value);
                          if (serviceAddError) setServiceAddError("");
                        }}
                        className="cd-input-field"
                      />
                    </div>
                  )}

                  {/* Service Date & Qty Row */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>Service Date *</label>
                      <input
                        type="date"
                        value={newServiceDate}
                        onChange={(e) => {
                          setNewServiceDate(e.target.value);
                          if (serviceAddError) setServiceAddError("");
                        }}
                        className="cd-input-field"
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "85px", flexShrink: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#555", textAlign: "center" }}>Qty *</label>
                      <input
                        type="number"
                        min={1}
                        value={newServiceQty}
                        onChange={(e) => {
                          setNewServiceQty(e.target.value === "" ? ("" as unknown as number) : Number(e.target.value));
                          if (serviceAddError) setServiceAddError("");
                        }}
                        className="cd-input-field"
                        style={{ textAlign: "center" }}
                      />
                    </div>
                  </div>

                  {/* Price & Add Button Row */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>Price (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className="cd-input-field"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddServiceItem}
                      style={{
                        padding: "8px 16px", height: "38px", whiteSpace: "nowrap", flexShrink: 0,
                        background: "#a27022", color: "#fff", border: "none", borderRadius: "4px",
                        cursor: "pointer", fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "13px"
                      }}
                    >
                      + Add Service
                    </button>
                  </div>

                  {/* Add-on Checkboxes */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "2px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#666" }}>Add-on Options:</span>
                    <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "#333" }}>
                        <input
                          type="checkbox"
                          checked={includeHairstyle}
                          onChange={(e) => setIncludeHairstyle(e.target.checked)}
                          style={{ accentColor: "#a27022", width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        + Hairstyle
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "#333" }}>
                        <input
                          type="checkbox"
                          checked={includeLens}
                          onChange={(e) => setIncludeLens(e.target.checked)}
                          style={{ accentColor: "#a27022", width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        + Lens
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "#333" }}>
                        <input
                          type="checkbox"
                          checked={includeLashes}
                          onChange={(e) => setIncludeLashes(e.target.checked)}
                          style={{ accentColor: "#a27022", width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        + Lashes
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Inputs Row */}
              <div className="cd-form-row-3">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                    Total Price (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newTotalPrice === 0 ? "" : newTotalPrice}
                    onChange={(e) => setNewTotalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="cd-input-field"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                    Received Money (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newAdvance === 0 ? "" : newAdvance}
                    onChange={(e) => setNewAdvance(e.target.value === "" ? "" : Number(e.target.value))}
                    className="cd-input-field"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "'Cinzel', serif", color: "#a27022" }}>
                    Travel Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newTravelAmount === 0 ? "" : newTravelAmount}
                    onChange={(e) => setNewTravelAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="cd-input-field"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setShowAddPopup(false)}
                style={{
                  padding: "8px 16px", background: "#fcf9f2", border: "1px solid #c4a060",
                  borderRadius: "4px", cursor: "pointer", color: "#a27022",
                  fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                style={{
                  padding: "8px 16px", background: "#a27022", color: "#fff",
                  border: "none", borderRadius: "4px", cursor: "pointer",
                  fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "14px"
                }}
              >
                {editingId ? "Save Changes" : "Create Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1100,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#fff", padding: "32px", borderRadius: "12px",
            width: "90%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column", alignItems: "center",
            fontFamily: "'EB Garamond', serif", color: "#1a1a1a", textAlign: "center"
          }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%",
              background: confirmAction.type === 'delete' ? "#feecec" : "#fcf9f2",
              color: confirmAction.type === 'delete' ? "#cc5555" : "#a27022",
              display: "flex", justifyContent: "center", alignItems: "center",
              fontSize: "28px", marginBottom: "16px"
            }}>
              {confirmAction.type === 'delete' ? "!" : "?"}
            </div>
            
            <h3 style={{ margin: "0 0 12px 0", color: "#1a1a1a", fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 600 }}>
              {confirmAction.type === 'delete' ? "Confirm Deletion" : "Confirm Edit"}
            </h3>
            
            <p style={{ margin: "0 0 24px 0", color: "#666", fontSize: "16px", lineHeight: "1.5" }}>
              {confirmAction.type === 'delete' 
                ? "Are you sure you want to delete this booking? This action cannot be undone." 
                : "Are you sure you want to proceed with editing this booking?"}
            </p>
            
            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <button 
                onClick={() => setConfirmAction(null)} 
                style={{ 
                  flex: 1, padding: "12px", background: "#f5f5f5", border: "none", 
                  borderRadius: "6px", cursor: "pointer", color: "#555", 
                  fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={executeConfirmAction} 
                style={{ 
                  flex: 1, padding: "12px", 
                  background: confirmAction.type === 'delete' ? "#cc5555" : "#a27022", 
                  color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", 
                  fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" 
                }}
              >
                {confirmAction.type === 'delete' ? "Delete" : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingRecord && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1200,
          backdropFilter: "blur(4px)",
          padding: "16px"
        }} onClick={() => setViewingRecord(null)}>
          <div style={{
            background: "#fff", padding: "28px 24px", borderRadius: "12px",
            width: "100%", maxWidth: "520px", maxHeight: "90vh",
            overflowY: "auto",
            overscrollBehavior: "contain",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            display: "flex", flexDirection: "column", gap: "18px",
            fontFamily: "'EB Garamond', serif", color: "#1a1a1a",
            position: "relative"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #eee", paddingBottom: "14px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#a27022", fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 600 }}>Booking Details</h3>
                <span style={{ fontSize: "14px", color: "#666" }}>ID: #{viewingRecord.id} • {formatDisplayDate(viewingRecord.bookingDate)}</span>
              </div>
              <button onClick={() => setViewingRecord(null)} style={{ background: "none", border: "none", fontSize: "28px", cursor: "pointer", color: "#999", lineHeight: 1, padding: "0 4px" }}>&times;</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "16px" }}>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Client Name</strong>{viewingRecord.clientName}</div>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Venue</strong>{viewingRecord.venue || '-'}</div>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Phone No.</strong>{viewingRecord.phone || '-'}</div>
              <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Email</strong>{viewingRecord.email || '-'}</div>
              
              <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #eee", paddingTop: "14px" }}>
                {(() => {
                  const allServices = parseServices(viewingRecord.services);
                  const displayedServices = showAllServices ? allServices : allServices.slice(0, 3);
                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Services Taken ({viewingRecord.noOfServices || allServices.length})
                        </strong>
                        {allServices.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllServices(!showAllServices)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#a27022",
                              fontFamily: "'Cinzel', serif",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: "2px 6px",
                              textDecoration: "underline"
                            }}
                          >
                            {showAllServices ? "Show less ▴" : `Show all (${allServices.length}) ▾`}
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {displayedServices.length > 0 ? (
                          displayedServices.map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fcf9f2", border: "1px solid #e0d5c1", padding: "8px 12px", borderRadius: "4px", fontSize: "14px" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{s.name}</span>
                                {(s.date || s.qty) && (
                                  <span style={{ fontSize: "12px", color: "#666" }}>
                                    {s.date ? formatDisplayDate(s.date) : ""} {s.date ? " • " : ""}Qty: {s.qty || 1}
                                  </span>
                                )}
                              </div>
                              <span style={{ color: "#a27022", fontWeight: "bold" }}>₹{Number(s.price).toLocaleString("en-IN")}</span>
                            </div>
                          ))
                        ) : (
                          <span style={{ color: "#999", fontStyle: "italic" }}>No services listed</span>
                        )}
                      </div>

                      {allServices.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setShowAllServices(!showAllServices)}
                            style={{
                              background: "#fcf9f2",
                              border: "1px solid #e0d5c1",
                              borderRadius: "4px",
                              color: "#a27022",
                              fontFamily: "'Cinzel', serif",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: "5px 14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            {showAllServices ? "Show less ▴" : `Show all (${allServices.length}) ▾`}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #eee", paddingTop: "14px", display: "flex", justifyContent: "space-between" }}>
                <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Total Price</strong><span style={{ fontSize: "18px", fontWeight: "bold" }}>₹{viewingRecord.totalPrice}</span></div>
                <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Received Money</strong><span style={{ fontSize: "18px" }}>₹{viewingRecord.advance}</span></div>
                <div><strong style={{ color: "#a27022", display: "block", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Travel Fee</strong><span style={{ fontSize: "18px" }}>₹{viewingRecord.travelAmount}</span></div>
              </div>
              <div style={{ gridColumn: "1 / -1", background: "#fcf9f2", padding: "16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e0d5c1" }}>
                <strong style={{ color: "#a27022", fontSize: "16px", fontFamily: "'Cinzel', serif" }}>Balance Due:</strong>
                <span style={{ fontSize: "22px", fontWeight: "bold", color: "#1a1a1a" }}>₹{(viewingRecord.totalPrice + (viewingRecord.travelAmount || 0)) - viewingRecord.advance}</span>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
              <button onClick={() => { setConfirmAction({ type: 'edit', recordId: viewingRecord.id, record: viewingRecord }); setViewingRecord(null); }} style={{ flex: 1, padding: "12px", background: "#fcf9f2", border: "1px solid #c4a060", borderRadius: "6px", cursor: "pointer", color: "#a27022", fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" }}>Edit Booking</button>
              <button onClick={() => generateMakeupPDF(viewingRecord)} style={{ flex: 1, padding: "12px", background: "#a27022", border: "none", borderRadius: "6px", cursor: "pointer", color: "#fff", fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" }}>📄 Download Invoice</button>
              {((viewingRecord.totalPrice + (viewingRecord.travelAmount || 0)) - viewingRecord.advance) > 0 && (
                <button onClick={() => handlePaymentSettled(viewingRecord)} style={{ flex: "1 1 100%", padding: "12px", background: "#3a7a3a", border: "none", borderRadius: "6px", cursor: "pointer", color: "#fff", fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: "15px" }}>Payment Settled</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
