import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './MakeupCalendar.css';
import { generateMakeupPDF } from '../utils/pdfGenerator.js';

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

export type CalendarView = "month" | "week" | "day";

export interface BookingDateRange {
  dates: string[];
  startDate: string;
  endDate: string;
  isMultiDay: boolean;
}

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
        // fall through
      }
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        price: "",
        qty: 1,
        date: "",
      }));
  }
  return [];
};

function parseISODate(dStr: string): string | null {
  if (!dStr) return null;
  const trimmed = dStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  const dt = new Date(trimmed);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function getBookingDateRange(record: MakeupRecord): BookingDateRange {
  const datesSet = new Set<string>();
  const rawDate = record.bookingDate || "";

  // Check multi-day separators: "2027-01-17 to 2027-01-18", "2027-01-17 - 2027-01-18", "January 17–18, 2027"
  const parts = rawDate.split(/\s+(?:to|-|–|—)\s+/i);

  if (parts.length === 2) {
    const d1 = parseISODate(parts[0].trim());
    const d2 = parseISODate(parts[1].trim());
    if (d1 && d2) {
      const start = d1 <= d2 ? d1 : d2;
      const end = d1 <= d2 ? d2 : d1;
      const curr = new Date(start);
      const stop = new Date(end);
      while (curr <= stop) {
        datesSet.add(curr.toISOString().split("T")[0]);
        curr.setDate(curr.getDate() + 1);
      }
    }
  } else {
    const single = parseISODate(rawDate);
    if (single) datesSet.add(single);
  }

  // Also check individual service dates
  const services = parseServices(record.services);
  services.forEach((s) => {
    if (s.date) {
      const sDate = parseISODate(s.date);
      if (sDate) datesSet.add(sDate);
    }
  });

  if (datesSet.size === 0) {
    datesSet.add(new Date().toISOString().split("T")[0]);
  }

  const sortedDates = Array.from(datesSet).sort();
  return {
    dates: sortedDates,
    startDate: sortedDates[0],
    endDate: sortedDates[sortedDates.length - 1],
    isMultiDay: sortedDates.length > 1,
  };
}

function getPaymentStatus(record: MakeupRecord): "Fully Paid" | "Partially Paid" | "Payment Pending" {
  const total = Number(record.totalPrice || 0) + Number(record.travelAmount || 0);
  const adv = Number(record.advance || 0);
  if (adv >= total && total > 0) return "Fully Paid";
  if (adv > 0 && adv < total) return "Partially Paid";
  return "Payment Pending";
}

function getBookingStatus(record: MakeupRecord, range: BookingDateRange): "Confirmed" | "Completed" | "Cancelled" {
  const todayStr = new Date().toISOString().split("T")[0];
  if (record.venue && record.venue.toLowerCase().includes("cancelled")) return "Cancelled";
  if (range.endDate < todayStr) return "Completed";
  return "Confirmed";
}

function generateGoogleCalendarUrl(record: MakeupRecord): string {
  const range = getBookingDateRange(record);
  const startClean = range.startDate.replace(/-/g, "");
  const endD = new Date(range.endDate);
  endD.setDate(endD.getDate() + 1);
  const endClean = endD.toISOString().split("T")[0].replace(/-/g, "");

  const title = `Anjali Makeover: ${record.clientName}`;
  const servicesList = parseServices(record.services)
    .map((s) => `• ${s.name} (Qty: ${s.qty || 1})`)
    .join("\n");
  const details = `Client: ${record.clientName}\nPhone: ${record.phone || 'N/A'}\nVenue: ${record.venue || 'N/A'}\nTotal: ₹${record.totalPrice}\nAdvance: ₹${record.advance}\nServices:\n${servicesList}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${startClean}/${endClean}&details=${encodeURIComponent(
    details
  )}&location=${encodeURIComponent(record.venue || '')}`;
}

function downloadICS(record: MakeupRecord) {
  const range = getBookingDateRange(record);
  const startClean = range.startDate.replace(/-/g, "");
  const endD = new Date(range.endDate);
  endD.setDate(endD.getDate() + 1);
  const endClean = endD.toISOString().split("T")[0].replace(/-/g, "");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anjali Makeup Studio//Booking Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${record.id}@anjalimakeover.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${startClean}`,
    `DTEND;VALUE=DATE:${endClean}`,
    `SUMMARY:Anjali Makeover - ${record.clientName}`,
    `DESCRIPTION:Venue: ${record.venue || 'N/A'}\\nPhone: ${record.phone || 'N/A'}\\nTotal: ₹${record.totalPrice}\\nAdvance: ₹${record.advance}`,
    `LOCATION:${record.venue || ''}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `booking-${record.clientName.replace(/\s+/g, '_')}-${range.startDate}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface MakeupCalendarProps {
  onNavigate?: (view: string) => void;
}

export default function MakeupCalendar({ onNavigate }: MakeupCalendarProps) {
  const [data, setData] = useState<MakeupRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarView>("month");
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Filters State
  const [search, setSearch] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // User availability / Holidays stored in localStorage
  const [holidays, setHolidays] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('anjali_calendar_holidays');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleHoliday = (dateStr: string) => {
    setHolidays((prev) => {
      const next = prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr];
      try {
        localStorage.setItem('anjali_calendar_holidays', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Add/Edit Booking Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [clientNameInput, setClientNameInput] = useState<string>("");
  const [bookingDateInput, setBookingDateInput] = useState<string>("");
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");
  const [venueInput, setVenueInput] = useState<string>("");
  const [advanceInput, setAdvanceInput] = useState<number | "">("");
  const [totalPriceInput, setTotalPriceInput] = useState<number | "">("");
  const [travelAmountInput, setTravelAmountInput] = useState<number | "">("");
  const [newServices, setNewServices] = useState<ServiceItem[]>([]);
  const [selectedServiceOption, setSelectedServiceOption] = useState<string>("");
  const [customServiceName, setCustomServiceName] = useState<string>("");
  const [includeHairstyle, setIncludeHairstyle] = useState<boolean>(true);
  const [includeLens, setIncludeLens] = useState<boolean>(true);
  const [includeLashes, setIncludeLashes] = useState<boolean>(true);
  const [newServicePrice, setNewServicePrice] = useState<number | "">("");
  const [newServiceDate, setNewServiceDate] = useState<string>("");
  const [newServiceQty, setNewServiceQty] = useState<number>(1);
  const [serviceAddError, setServiceAddError] = useState<string>("");

  // Validation State (Matching Anjali Makeover form)
  const [modalErrors, setModalErrors] = useState<{ client?: string; bookingDate?: string; phone?: string; services?: string }>({});
  const [modalErrorList, setModalErrorList] = useState<string[]>([]);
  const [modalHasSubmitted, setModalHasSubmitted] = useState<boolean>(false);
  const modalBoxRef = useRef<HTMLDivElement>(null);

  // Viewing detail popup modal
  const [viewingRecord, setViewingRecord] = useState<MakeupRecord | null>(null);
  const [showAllServices, setShowAllServices] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Fetch Booking Data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/makeup').catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        // Fallback mock records
        setData([
          {
            id: 1,
            clientName: "Priya Sharma",
            bookingDate: "2027-01-15",
            advance: 5000,
            totalPrice: 15000,
            venue: "Grand Hyatt",
            phone: "9876543210",
            services: JSON.stringify([{ name: "Bridal Makeup", date: "2027-01-15", price: 15000, qty: 1 }]),
            noOfServices: 1,
            travelAmount: 500,
          },
          {
            id: 2,
            clientName: "Prachi Jain",
            bookingDate: "2027-01-17 to 2027-01-18",
            advance: 35000,
            totalPrice: 35000,
            venue: "Taj Palace",
            phone: "9822334455",
            services: JSON.stringify([
              { name: "Sangeet Makeup", date: "2027-01-17", price: 15000, qty: 1 },
              { name: "Bridal Makeup", date: "2027-01-18", price: 20000, qty: 1 }
            ]),
            noOfServices: 2,
            travelAmount: 1000,
          },
          {
            id: 3,
            clientName: "Neha Gupta",
            bookingDate: "2027-01-22",
            advance: 4000,
            totalPrice: 12000,
            venue: "Oberoi Hotel",
            phone: "9811223344",
            services: JSON.stringify([{ name: "Engagement Makeup", date: "2027-01-22", price: 12000, qty: 1 }]),
            noOfServices: 1,
            travelAmount: 0,
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map each booking to its date range & parsed details
  const enrichedBookings = useMemo(() => {
    return data.map((record) => {
      const range = getBookingDateRange(record);
      const paymentStatus = getPaymentStatus(record);
      const bookingStatus = getBookingStatus(record, range);
      const parsedServices = parseServices(record.services);
      return {
        ...record,
        range,
        paymentStatus,
        bookingStatus,
        parsedServices,
      };
    });
  }, [data]);

  // Apply Search & Filters
  const filteredBookings = useMemo(() => {
    return enrichedBookings.filter((b) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchClient = b.clientName.toLowerCase().includes(q);
        const matchPhone = b.phone ? b.phone.includes(q) : false;
        const matchVenue = b.venue ? b.venue.toLowerCase().includes(q) : false;
        if (!matchClient && !matchPhone && !matchVenue) return false;
      }

      // Service Filter
      if (serviceFilter !== 'all') {
        const hasService = b.parsedServices.some((s) =>
          s.name.toLowerCase().includes(serviceFilter.toLowerCase())
        );
        if (!hasService) return false;
      }

      // Payment Filter
      if (paymentFilter !== 'all' && b.paymentStatus !== paymentFilter) {
        return false;
      }

      // Booking Status Filter
      if (statusFilter !== 'all' && b.bookingStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedBookings, search, serviceFilter, paymentFilter, statusFilter]);

  // Quick lookup of bookings by date: { 'YYYY-MM-DD': Booking[] }
  const bookingsByDate = useMemo(() => {
    const map: Record<string, typeof filteredBookings> = {};
    filteredBookings.forEach((b) => {
      b.range.dates.forEach((dateStr) => {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(b);
      });
    });
    return map;
  }, [filteredBookings]);

  // Calendar Period Range Calculations
  const periodDates = useMemo(() => {
    const dates: string[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(dStr);
      }
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay(); // 0 is Sunday
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }
    } else {
      // Day view
      dates.push(currentDate.toISOString().split("T")[0]);
    }
    return dates;
  }, [currentDate, viewMode]);

  // Summary Metrics (Section 5)
  // Unique bookings intersecting the period to prevent double-counting multi-day bookings
  const summaryMetrics = useMemo(() => {
    const periodSet = new Set(periodDates);
    const uniqueMap = new Map<number, (typeof filteredBookings)[0]>();

    filteredBookings.forEach((b) => {
      const intersects = b.range.dates.some((d) => periodSet.has(d));
      if (intersects) {
        uniqueMap.set(b.id, b);
      }
    });

    const uniqueList = Array.from(uniqueMap.values());
    const totalBookings = uniqueList.length;
    const totalRevenue = uniqueList.reduce(
      (sum, b) => sum + Number(b.totalPrice || 0) + Number(b.travelAmount || 0),
      0
    );
    const amountReceived = uniqueList.reduce(
      (sum, b) => sum + Number(b.advance || 0),
      0
    );
    const pendingAmount = uniqueList.reduce((sum, b) => {
      const full = Number(b.totalPrice || 0) + Number(b.travelAmount || 0);
      const adv = Number(b.advance || 0);
      return sum + Math.max(0, full - adv);
    }, 0);

    let availableDays = 0;
    let fullyBookedDays = 0;

    periodDates.forEach((dStr) => {
      const dayBookings = bookingsByDate[dStr] || [];
      const isHoliday = holidays.includes(dStr);
      if (dayBookings.length === 0 && !isHoliday) {
        availableDays++;
      }
      if (dayBookings.length >= 3 || (dayBookings.length > 0 && isHoliday)) {
        fullyBookedDays++;
      }
    });

    return {
      totalBookings,
      totalRevenue,
      amountReceived,
      pendingAmount,
      availableDays,
      fullyBookedDays,
    };
  }, [periodDates, filteredBookings, bookingsByDate, holidays]);

  // Date Navigation Handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() - 7);
      } else {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split("T")[0]);
  };

  // Open Day Details Drawer
  const handleDateClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setDrawerOpen(true);
  };

  // Validation (Matching Anjali Makeover form rules)
  // - Client name is required
  // - Date is required
  // - Phone no. is required and 10 digits only
  // - Quantity greater than 0 and date of every service required
  // Without this validation form cannot be submitted
  const validateModalForm = useCallback((
    cName = clientNameInput,
    bDate = bookingDateInput,
    ph = phoneInput,
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
  }, [clientNameInput, bookingDateInput, phoneInput, newServices]);

  // Live validation updates after first submit attempt
  useEffect(() => {
    if (modalHasSubmitted) {
      const { errors, list } = validateModalForm();
      setModalErrors(errors);
      setModalErrorList(list);
    }
  }, [modalHasSubmitted, validateModalForm]);

  // Open Add Booking Form
  const handleOpenAdd = (dateStr?: string) => {
    const defaultDate = dateStr || selectedDateStr || new Date().toISOString().split("T")[0];
    setEditingId(null);
    setClientNameInput("");
    setBookingDateInput(defaultDate);
    setPhoneInput("");
    setEmailInput("");
    setVenueInput("");
    setAdvanceInput("");
    setTotalPriceInput("");
    setTravelAmountInput("");
    setNewServices([]);
    setSelectedServiceOption("");
    setCustomServiceName("");
    setNewServicePrice("");
    setNewServiceDate(defaultDate);
    setNewServiceQty(1);
    setIncludeHairstyle(true);
    setIncludeLens(true);
    setIncludeLashes(true);
    setServiceAddError("");
    setModalErrors({});
    setModalErrorList([]);
    setModalHasSubmitted(false);
    setShowAddModal(true);
  };

  // Edit Booking Form Pre-fill
  const handleOpenEdit = (record: MakeupRecord) => {
    setEditingId(record.id);
    setClientNameInput(record.clientName);
    setBookingDateInput(record.bookingDate);
    setPhoneInput(record.phone || "");
    setEmailInput(record.email || "");
    setVenueInput(record.venue || "");
    setAdvanceInput(record.advance === 0 ? "" : record.advance);
    setTotalPriceInput(record.totalPrice === 0 ? "" : record.totalPrice);
    setTravelAmountInput(record.travelAmount === 0 ? "" : record.travelAmount);
    const parsed = parseServices(record.services);
    setNewServices(parsed);
    setSelectedServiceOption("");
    setCustomServiceName("");
    setNewServicePrice("");
    setNewServiceDate(record.bookingDate || new Date().toISOString().split("T")[0]);
    setNewServiceQty(1);
    setIncludeHairstyle(true);
    setIncludeLens(true);
    setIncludeLashes(true);
    setServiceAddError("");
    setModalErrors({});
    setModalErrorList([]);
    setModalHasSubmitted(false);
    setShowAddModal(true);
  };

  // Save Booking (POST/PUT) with Validation Guard
  const handleSaveBooking = async () => {
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
      clientName: clientNameInput.trim(),
      phone: phoneInput.replace(/\D/g, "").slice(0, 10),
      email: emailInput.trim(),
      bookingDate: bookingDateInput.trim(),
      advance: Number(advanceInput) || 0,
      totalPrice: Number(totalPriceInput) || 0,
      venue: venueInput.trim(),
      services: JSON.stringify(
        newServices.map((s) => ({
          name: s.name,
          date: s.date || bookingDateInput.trim(),
          qty: Number(s.qty) || 1,
          price: Number(s.price) || 0,
        }))
      ),
      noOfServices: newServices.length || 1,
      travelAmount: Number(travelAmountInput) || 0,
    };

    try {
      if (editingId) {
        const res = await fetch('/api/makeup', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        if (res.ok) {
          const updated = await res.json();
          setData((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
        } else {
          setData((prev) =>
            prev.map((r) => (r.id === editingId ? ({ ...r, ...payload } as MakeupRecord) : r))
          );
        }
      } else {
        const res = await fetch('/api/makeup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setData((prev) => [created, ...prev]);
        } else {
          setData((prev) => [{ id: Date.now(), ...payload } as MakeupRecord, ...prev]);
        }
      }
    } catch (err) {
      console.error(err);
      if (editingId) {
        setData((prev) =>
          prev.map((r) => (r.id === editingId ? ({ ...r, ...payload } as MakeupRecord) : r))
        );
      } else {
        setData((prev) => [{ id: Date.now(), ...payload } as MakeupRecord, ...prev]);
      }
    }

    setShowAddModal(false);
  };

  // Delete Booking
  const handleDeleteBooking = async (id: number) => {
    try {
      await fetch(`/api/makeup?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
    setData((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirmId(null);
    if (viewingRecord?.id === id) setViewingRecord(null);
  };

  // Settle Payment in One Click
  const handleSettlePayment = async (record: MakeupRecord) => {
    const full = Number(record.totalPrice) + Number(record.travelAmount || 0);
    const updated = { ...record, advance: full };
    try {
      await fetch('/api/makeup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.error(e);
    }
    setData((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
    if (viewingRecord?.id === record.id) setViewingRecord(updated);
  };

  // Add Service Item in Modal with Service Date, Qty & Validation
  const handleAddServiceItem = () => {
    if (!selectedServiceOption) {
      setServiceAddError("Please select a service name.");
      return;
    }
    const nameTrimmed = selectedServiceOption === 'Custom' ? customServiceName.trim() : selectedServiceOption.trim();
    if (!nameTrimmed) {
      setServiceAddError("Please enter custom service name.");
      return;
    }

    const sDate = (newServiceDate || bookingDateInput || new Date().toISOString().split("T")[0]).trim();
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

    let finalName = nameTrimmed;
    const addons: string[] = [];
    if (includeHairstyle && !finalName.toLowerCase().includes("hairstyle")) addons.push("Hairstyle");
    if (includeLens && !finalName.toLowerCase().includes("lens")) addons.push("Lens");
    if (includeLashes && !finalName.toLowerCase().includes("lashes")) addons.push("Lashes");
    if (addons.length > 0) finalName += " + " + addons.join(" + ");

    const p = newServicePrice === "" ? 0 : Number(newServicePrice);
    const updated = [...newServices, { name: finalName, price: p, qty: sQty, date: sDate }];
    setNewServices(updated);

    const newTotal = updated.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    setTotalPriceInput(newTotal === 0 ? "" : newTotal);

    setSelectedServiceOption("");
    setCustomServiceName("");
    setNewServicePrice("");
    setNewServiceQty(1);
    setIncludeHairstyle(true);
    setIncludeLens(true);
    setIncludeLashes(true);
  };

  const handleRemoveServiceItem = (idx: number) => {
    const updated = newServices.filter((_, i) => i !== idx);
    setNewServices(updated);
    const newTotal = updated.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    setTotalPriceInput(newTotal === 0 ? "" : newTotal);
  };

  // Format Month Year Display Title
  const formattedPeriodTitle = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const d1 = new Date(periodDates[0]);
      const d2 = new Date(periodDates[6]);
      return `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [currentDate, viewMode, periodDates]);

  // Calendar Matrix for Monthly View
  const calendarMonthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      cells.push({
        dateStr: prevDate.toISOString().split("T")[0],
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
      });
    }

    // Next month padding to fill complete weeks (up to 35 or 42 cells)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let day = 1; day <= remaining; day++) {
        const nextDate = new Date(year, month + 1, day);
        cells.push({
          dateStr: nextDate.toISOString().split("T")[0],
          dayNumber: day,
          isCurrentMonth: false,
          isToday: false,
        });
      }
    }

    return cells;
  }, [currentDate]);

  const selectedDateBookings = bookingsByDate[selectedDateStr] || [];

  return (
    <div className="cal-container">
      {/* ── TOP HEADER & NAVIGATION BAR ── */}
      <header className="cal-top-header">
        <div className="cal-brand-area">
          <h1 className="cal-brand-title">
            <span>✦</span> Anjali Makeup Studio
          </h1>
          <span className="cal-brand-subtitle">Calendar Booking Management</span>
        </div>

        <div className="cal-top-actions">
          {onNavigate && (
            <button
              type="button"
              className="cal-btn-view-switch"
              onClick={() => onNavigate("MakeupData")}
              title="Switch to Table View"
            >
              📋 Table View (Dashboard)
            </button>
          )}

          <button
            type="button"
            className="cal-btn-add"
            onClick={() => handleOpenAdd()}
          >
            + Add New Booking
          </button>
        </div>
      </header>

      {/* ── SUMMARY DASHBOARD CARDS (Section 5) ── */}
      <section className="cal-summary-grid">
        <div className="cal-summary-card accent-blue">
          <div className="cal-summary-label">
            <span>Total Bookings</span>
            <span>📅</span>
          </div>
          <div className="cal-summary-value">{summaryMetrics.totalBookings}</div>
          <div className="cal-summary-sub">In selected period</div>
        </div>

        <div className="cal-summary-card accent-pink">
          <div className="cal-summary-label">
            <span>Total Revenue</span>
            <span>₹</span>
          </div>
          <div className="cal-summary-value">
            ₹{summaryMetrics.totalRevenue.toLocaleString("en-IN")}
          </div>
          <div className="cal-summary-sub">Expected revenue</div>
        </div>

        <div className="cal-summary-card accent-green">
          <div className="cal-summary-label">
            <span>Amount Received</span>
            <span>✓</span>
          </div>
          <div className="cal-summary-value" style={{ color: "var(--cal-success)" }}>
            ₹{summaryMetrics.amountReceived.toLocaleString("en-IN")}
          </div>
          <div className="cal-summary-sub">Advance & full payments</div>
        </div>

        <div className="cal-summary-card accent-red">
          <div className="cal-summary-label">
            <span>Pending Amount</span>
            <span>⏳</span>
          </div>
          <div className="cal-summary-value" style={{ color: "var(--cal-danger)" }}>
            ₹{summaryMetrics.pendingAmount.toLocaleString("en-IN")}
          </div>
          <div className="cal-summary-sub">Outstanding balance</div>
        </div>

        <div className="cal-summary-card">
          <div className="cal-summary-label">
            <span>Available Days</span>
            <span>☀️</span>
          </div>
          <div className="cal-summary-value">{summaryMetrics.availableDays}</div>
          <div className="cal-summary-sub">Zero bookings</div>
        </div>

        <div className="cal-summary-card accent-purple">
          <div className="cal-summary-label">
            <span>Fully Booked Days</span>
            <span>👑</span>
          </div>
          <div className="cal-summary-value">{summaryMetrics.fullyBookedDays}</div>
          <div className="cal-summary-sub">≥ 3 bookings / marked</div>
        </div>
      </section>

      {/* ── TOOLBAR: CONTROLS, VIEW TOGGLE & FILTERS ── */}
      <section className="cal-toolbar">
        <div className="cal-toolbar-main">
          <div className="cal-date-nav">
            <button type="button" className="cal-nav-btn" onClick={handlePrev} title="Previous">
              ‹
            </button>
            <button type="button" className="cal-btn-today" onClick={handleToday}>
              Today
            </button>
            <button type="button" className="cal-nav-btn" onClick={handleNext} title="Next">
              ›
            </button>
            <span className="cal-current-label">{formattedPeriodTitle}</span>
          </div>

          <div className="cal-view-modes">
            <button
              type="button"
              className={`cal-view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`cal-view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Weekly
            </button>
            <button
              type="button"
              className={`cal-view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Daily
            </button>
          </div>
        </div>

        {/* Filters Row (Section 10) */}
        <div className="cal-filter-row">
          <input
            type="text"
            className="cal-search-input"
            placeholder="🔍 Search client, phone, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="cal-select-filter"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="all">All Services</option>
            <option value="Bridal">Bridal Makeup</option>
            <option value="Engagement">Engagement Makeup</option>
            <option value="Sangeet">Sangeet Makeup</option>
            <option value="Haldi">Haldi Makeup</option>
            <option value="Basic">Basic / Party Makeup</option>
            <option value="HD">HD / Airbrush Makeup</option>
          </select>

          <select
            className="cal-select-filter"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">All Payments</option>
            <option value="Fully Paid">Fully Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Payment Pending">Payment Pending</option>
          </select>

          <select
            className="cal-select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {(search || serviceFilter !== 'all' || paymentFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              className="cal-btn-outline"
              style={{ fontSize: "11px", padding: "4px 8px" }}
              onClick={() => {
                setSearch("");
                setServiceFilter("all");
                setPaymentFilter("all");
                setStatusFilter("all");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* ── MAIN CALENDAR VIEWS ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--cal-gold)" }}>
          <h3>Loading Calendar Bookings...</h3>
        </div>
      ) : (
        <>
          {/* A. MONTHLY VIEW (DEFAULT) */}
          {viewMode === 'month' && (
            <div className="cal-month-card">
              <div className="cal-grid-header">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                  <div key={d} className="cal-day-name">
                    {d.slice(0, 3)}
                  </div>
                ))}
              </div>

              <div className="cal-grid-body">
                {calendarMonthMatrix.map((cell, idx) => {
                  const dayBookings = bookingsByDate[cell.dateStr] || [];
                  const isSelected = cell.dateStr === selectedDateStr;
                  const isHoliday = holidays.includes(cell.dateStr);
                  const hasPending = dayBookings.some((b) => b.paymentStatus === 'Payment Pending');
                  const allPaid = dayBookings.length > 0 && dayBookings.every((b) => b.paymentStatus === 'Fully Paid');

                  const dayRevenue = dayBookings.reduce(
                    (s, b) => s + Number(b.totalPrice || 0) + Number(b.travelAmount || 0),
                    0
                  );

                  return (
                    <div
                      key={idx}
                      className={`cal-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isHoliday ? 'holiday' : ''}`}
                      onClick={() => handleDateClick(cell.dateStr)}
                    >
                      <div className="cal-cell-header">
                        <span className="cal-date-number">{cell.dayNumber}</span>
                        {dayBookings.length > 0 && (
                          <span
                            className={`cal-booking-count-badge ${hasPending ? 'has-pending' : allPaid ? 'fully-paid' : ''}`}
                            title={`${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}`}
                          >
                            {dayBookings.length}
                          </span>
                        )}
                        {isHoliday && dayBookings.length === 0 && (
                          <span style={{ fontSize: "10px", color: "#888" }}>🏖️ Off</span>
                        )}
                      </div>

                      {/* Chips */}
                      <div className="cal-cell-chips">
                        {dayBookings.slice(0, 2).map((b) => {
                          const chipClass =
                            b.bookingStatus === 'Cancelled'
                              ? 'status-cancelled'
                              : b.range.isMultiDay
                              ? 'status-multiday'
                              : b.paymentStatus === 'Fully Paid'
                              ? 'status-paid'
                              : b.paymentStatus === 'Partially Paid'
                              ? 'status-partial'
                              : 'status-pending';

                          return (
                            <div
                              key={b.id}
                              className={`cal-chip ${chipClass}`}
                              title={`${b.clientName} (₹${b.totalPrice}) - ${b.paymentStatus}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingRecord(b);
                              }}
                            >
                              <span className="cal-chip-dot" />
                              <span className="cal-chip-name">
                                {b.range.isMultiDay && "🗓️ "}
                                {b.clientName}
                              </span>
                              <span className="cal-chip-price">
                                ₹{Math.round(b.totalPrice / 1000)}k
                              </span>
                            </div>
                          );
                        })}

                        {dayBookings.length > 2 && (
                          <div className="cal-more-pill">
                            +{dayBookings.length - 2} more
                          </div>
                        )}
                      </div>

                      {dayRevenue > 0 && (
                        <div className="cal-cell-revenue">
                          ₹{dayRevenue.toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. WEEKLY VIEW */}
          {viewMode === 'week' && (
            <div className="cal-week-container">
              {periodDates.map((dateStr) => {
                const dayBookings = bookingsByDate[dateStr] || [];
                const dt = new Date(dateStr);
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = dt.getDate();
                const isHoliday = holidays.includes(dateStr);

                return (
                  <div key={dateStr} className="cal-week-day-col">
                    <div className={`cal-week-day-header ${isToday ? 'today' : ''}`}>
                      <div className="cal-week-day-name">{dayName}</div>
                      <div className="cal-week-date-num">{dayNum}</div>
                      {isHoliday && <div style={{ fontSize: "11px", color: "#c62828" }}>Holiday</div>}
                    </div>

                    <div className="cal-week-body">
                      {dayBookings.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#aaa", fontSize: "13px", marginTop: "24px", fontStyle: "italic" }}>
                          No bookings
                        </div>
                      ) : (
                        dayBookings.map((b) => (
                          <div
                            key={b.id}
                            className="cal-week-card"
                            onClick={() => setViewingRecord(b)}
                          >
                            <div className="cal-week-card-client">
                              {b.range.isMultiDay && <span title="Multi-day booking">🗓️ </span>}
                              {b.clientName}
                            </div>
                            <div className="cal-week-card-service">
                              {b.parsedServices.map((s) => s.name).join(", ") || "Makeup Service"}
                            </div>
                            <div className="cal-week-card-footer">
                              <span style={{ fontWeight: "bold", color: "var(--cal-gold)" }}>
                                ₹{Number(b.totalPrice).toLocaleString("en-IN")}
                              </span>
                              <span
                                className={`cal-badge ${
                                  b.paymentStatus === 'Fully Paid'
                                    ? 'paid'
                                    : b.paymentStatus === 'Partially Paid'
                                    ? 'partial'
                                    : 'pending'
                                }`}
                              >
                                {b.paymentStatus}
                              </span>
                            </div>
                          </div>
                        ))
                      )}

                      <button
                        type="button"
                        className="cal-btn-outline"
                        style={{ marginTop: "auto", fontSize: "11px", justifyContent: "center" }}
                        onClick={() => handleOpenAdd(dateStr)}
                      >
                        + Add Booking
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* C. DAILY VIEW */}
          {viewMode === 'day' && (
            <div className="cal-daily-container">
              <div className="cal-daily-header-card">
                <div>
                  <h2 style={{ margin: "0 0 6px 0", fontFamily: "'Cinzel', serif", color: "var(--cal-gold-dark)" }}>
                    {formattedPeriodTitle}
                  </h2>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", color: "var(--cal-text-muted)" }}>
                      {selectedDateBookings.length} Appointment{selectedDateBookings.length !== 1 ? 's' : ''} Scheduled
                    </span>
                    <button
                      type="button"
                      className="cal-btn-outline"
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                      onClick={() => toggleHoliday(periodDates[0])}
                    >
                      {holidays.includes(periodDates[0]) ? "☀️ Mark as Available" : "🏖️ Mark as Holiday"}
                    </button>
                  </div>
                </div>

                <div className="cal-daily-stats">
                  <div className="cal-daily-stat-item">
                    <span className="cal-daily-stat-label">Daily Revenue</span>
                    <span className="cal-daily-stat-val">
                      ₹{selectedDateBookings.reduce((sum, b) => sum + Number(b.totalPrice || 0) + Number(b.travelAmount || 0), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="cal-daily-stat-item">
                    <span className="cal-daily-stat-label">Advance</span>
                    <span className="cal-daily-stat-val" style={{ color: "var(--cal-success)" }}>
                      ₹{selectedDateBookings.reduce((sum, b) => sum + Number(b.advance || 0), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="cal-daily-stat-item">
                    <span className="cal-daily-stat-label">Pending</span>
                    <span className="cal-daily-stat-val" style={{ color: "var(--cal-danger)" }}>
                      ₹{selectedDateBookings.reduce((sum, b) => {
                        const full = Number(b.totalPrice || 0) + Number(b.travelAmount || 0);
                        return sum + Math.max(0, full - Number(b.advance || 0));
                      }, 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="cal-daily-list">
                {selectedDateBookings.length === 0 ? (
                  <div style={{ background: "#ffffff", padding: "40px", textAlign: "center", borderRadius: "10px", border: "1px solid var(--cal-gold-border)" }}>
                    <p style={{ fontSize: "16px", color: "#777", margin: "0 0 16px 0" }}>
                      No bookings scheduled for this date.
                    </p>
                    <button
                      type="button"
                      className="cal-btn-add"
                      onClick={() => handleOpenAdd(periodDates[0])}
                    >
                      + Add Booking for this Date
                    </button>
                  </div>
                ) : (
                  selectedDateBookings.map((b) => {
                    const fullAmount = Number(b.totalPrice || 0) + Number(b.travelAmount || 0);
                    const pendingAmount = Math.max(0, fullAmount - Number(b.advance || 0));

                    return (
                      <div key={b.id} className="cal-daily-booking-card">
                        <div className="cal-daily-card-top">
                          <div>
                            <div className="cal-daily-client-title">
                              {b.clientName}
                              <span
                                className={`cal-badge ${
                                  b.paymentStatus === 'Fully Paid'
                                    ? 'paid'
                                    : b.paymentStatus === 'Partially Paid'
                                    ? 'partial'
                                    : 'pending'
                                }`}
                              >
                                {b.paymentStatus}
                              </span>
                              {b.range.isMultiDay && (
                                <span className="cal-badge multiday">
                                  Multi-Day ({b.range.startDate} to {b.range.endDate})
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "13px", color: "var(--cal-text-muted)" }}>
                              Booking ID: #{b.id} • Venue: {b.venue || "Studio"} • Phone: {b.phone || "N/A"}
                            </span>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--cal-gold-dark)" }}>
                              ₹{fullAmount.toLocaleString("en-IN")}
                            </div>
                            {pendingAmount > 0 ? (
                              <span style={{ fontSize: "13px", color: "var(--cal-danger)", fontWeight: 600 }}>
                                Pending: ₹{pendingAmount.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span style={{ fontSize: "13px", color: "var(--cal-success)", fontWeight: 600 }}>
                                ✓ Fully Settled
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Services List */}
                        <div className="cal-daily-services-wrap">
                          <strong style={{ fontSize: "13px", color: "var(--cal-gold)", textTransform: "uppercase" }}>
                            Services Included ({b.parsedServices.length}):
                          </strong>
                          {b.parsedServices.map((s, idx) => (
                            <div key={idx} className="cal-daily-service-row">
                              <div>
                                <span style={{ fontWeight: 600 }}>{s.name}</span>
                                {s.date && <span style={{ fontSize: "12px", color: "#666", marginLeft: "6px" }}>({s.date})</span>}
                              </div>
                              <span style={{ fontWeight: 600, color: "var(--cal-gold-dark)" }}>
                                Qty: {s.qty || 1} • ₹{Number(s.price || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="cal-daily-actions">
                          <button
                            type="button"
                            className="cal-btn-outline"
                            onClick={() => setViewingRecord(b)}
                          >
                            👁️ View Details
                          </button>
                          <button
                            type="button"
                            className="cal-btn-outline"
                            onClick={() => handleOpenEdit(b)}
                          >
                            ✎ Edit
                          </button>
                          <button
                            type="button"
                            className="cal-btn-primary"
                            onClick={() => generateMakeupPDF(b)}
                          >
                            📄 Invoice PDF
                          </button>
                          <a
                            href={generateGoogleCalendarUrl(b)}
                            target="_blank"
                            rel="noreferrer"
                            className="cal-btn-outline"
                            style={{ textDecoration: "none" }}
                            title="Add event to Google Calendar"
                          >
                            📅 Google Calendar
                          </a>
                          <button
                            type="button"
                            className="cal-btn-outline"
                            onClick={() => downloadICS(b)}
                            title="Export .ICS iCalendar file"
                          >
                            📥 Export .ICS
                          </button>
                          {pendingAmount > 0 && (
                            <button
                              type="button"
                              className="cal-btn-success"
                              onClick={() => handleSettlePayment(b)}
                            >
                              ✓ Payment Settled
                            </button>
                          )}
                          <button
                            type="button"
                            className="cal-btn-danger"
                            onClick={() => setDeleteConfirmId(b.id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SIDE DRAWER: DAY DETAILS (Section 6) ── */}
      {drawerOpen && (
        <div className="cal-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="cal-drawer-panel" ref={drawerRef} onClick={(e) => e.stopPropagation()}>
            <div className="cal-drawer-header">
              <div>
                <h3 className="cal-drawer-title">{selectedDateStr}</h3>
                <span style={{ fontSize: "13px", color: "var(--cal-text-muted)" }}>
                  {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? 's' : ''} on this date
                </span>
              </div>
              <button
                type="button"
                className="cal-drawer-close"
                onClick={() => setDrawerOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="cal-drawer-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="cal-btn-outline"
                  onClick={() => toggleHoliday(selectedDateStr)}
                >
                  {holidays.includes(selectedDateStr) ? "☀️ Mark as Available" : "🏖️ Mark as Holiday"}
                </button>
                <button
                  type="button"
                  className="cal-btn-add"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                  onClick={() => {
                    handleOpenAdd(selectedDateStr);
                    setDrawerOpen(false);
                  }}
                >
                  + Add Booking
                </button>
              </div>

              {selectedDateBookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "#888" }}>
                  <p style={{ fontSize: "15px", margin: "0 0 10px 0" }}>No bookings on this day.</p>
                  <p style={{ fontSize: "13px", margin: 0 }}>Click "+ Add Booking" above to schedule an appointment.</p>
                </div>
              ) : (
                selectedDateBookings.map((b) => {
                  const full = Number(b.totalPrice || 0) + Number(b.travelAmount || 0);
                  const pending = Math.max(0, full - Number(b.advance || 0));

                  return (
                    <div
                      key={b.id}
                      style={{
                        background: "#fffdfa",
                        border: "1px solid var(--cal-gold-border)",
                        borderRadius: "8px",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <strong style={{ fontSize: "16px", color: "var(--cal-gold-dark)" }}>
                            {b.clientName}
                          </strong>
                          {b.range.isMultiDay && (
                            <span className="cal-badge multiday" style={{ marginLeft: "6px" }}>
                              Multi-Day
                            </span>
                          )}
                          <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                            📞 {b.phone || "No phone"} • 📍 {b.venue || "Studio"}
                          </div>
                        </div>

                        <span
                          className={`cal-badge ${
                            b.paymentStatus === 'Fully Paid'
                              ? 'paid'
                              : b.paymentStatus === 'Partially Paid'
                              ? 'partial'
                              : 'pending'
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: "13px", color: "#444", background: "var(--cal-gold-subtle)", padding: "6px 10px", borderRadius: "4px" }}>
                        <strong>Services:</strong> {b.parsedServices.map((s) => s.name).join(", ") || "Makeup"}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px dotted #e0d8cc", paddingTop: "6px" }}>
                        <span>Total: <strong>₹{full.toLocaleString("en-IN")}</strong></span>
                        <span>Advance: <strong>₹{Number(b.advance).toLocaleString("en-IN")}</strong></span>
                        <span style={{ color: pending > 0 ? "var(--cal-danger)" : "var(--cal-success)" }}>
                          Pending: <strong>₹{pending.toLocaleString("en-IN")}</strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        <button
                          type="button"
                          className="cal-btn-outline"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => {
                            setViewingRecord(b);
                            setDrawerOpen(false);
                          }}
                        >
                          👁️ View
                        </button>
                        <button
                          type="button"
                          className="cal-btn-outline"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => {
                            handleOpenEdit(b);
                            setDrawerOpen(false);
                          }}
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          className="cal-btn-primary"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => generateMakeupPDF(b)}
                        >
                          📄 PDF
                        </button>
                        {pending > 0 && (
                          <button
                            type="button"
                            className="cal-btn-success"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => handleSettlePayment(b)}
                          >
                            ✓ Settled
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW BOOKING DETAILS ── */}
      {viewingRecord && (
        <div className="cal-modal-backdrop" onClick={() => setViewingRecord(null)}>
          <div className="cal-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #eee", paddingBottom: "14px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "var(--cal-gold)", fontFamily: "'Cinzel', serif", fontSize: "22px", fontWeight: 700 }}>
                  Booking Details
                </h3>
                <span style={{ fontSize: "14px", color: "#666" }}>
                  ID: #{viewingRecord.id} • {viewingRecord.bookingDate}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                style={{ background: "none", border: "none", fontSize: "26px", cursor: "pointer", color: "#999" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "15px" }}>
              <div>
                <strong style={{ color: "var(--cal-gold)", display: "block", fontSize: "12px", textTransform: "uppercase" }}>Client Name</strong>
                {viewingRecord.clientName}
              </div>
              <div>
                <strong style={{ color: "var(--cal-gold)", display: "block", fontSize: "12px", textTransform: "uppercase" }}>Venue</strong>
                {viewingRecord.venue || '-'}
              </div>
              <div>
                <strong style={{ color: "var(--cal-gold)", display: "block", fontSize: "12px", textTransform: "uppercase" }}>Phone</strong>
                {viewingRecord.phone || '-'}
              </div>
              <div>
                <strong style={{ color: "var(--cal-gold)", display: "block", fontSize: "12px", textTransform: "uppercase" }}>Email</strong>
                {viewingRecord.email || '-'}
              </div>

              <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #eee", paddingTop: "12px" }}>
                <strong style={{ color: "var(--cal-gold)", display: "block", fontSize: "12px", textTransform: "uppercase", marginBottom: "8px" }}>
                  Services Taken ({parseServices(viewingRecord.services).length})
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(showAllServices
                    ? parseServices(viewingRecord.services)
                    : parseServices(viewingRecord.services).slice(0, 3)
                  ).map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--cal-gold-subtle)",
                        border: "1px solid var(--cal-gold-border)",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                        {s.date && <span style={{ fontSize: "12px", color: "#666", marginLeft: "6px" }}>({s.date})</span>}
                      </div>
                      <span style={{ color: "var(--cal-gold-dark)", fontWeight: "bold" }}>
                        Qty: {s.qty || 1} • ₹{Number(s.price || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>

                {parseServices(viewingRecord.services).length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllServices(!showAllServices)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--cal-gold)",
                      fontFamily: "'Cinzel', serif",
                      fontSize: "12px",
                      cursor: "pointer",
                      marginTop: "6px",
                      textDecoration: "underline"
                    }}
                  >
                    {showAllServices ? "Show less ▴" : `Show all (${parseServices(viewingRecord.services).length}) ▾`}
                  </button>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #eee", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ color: "var(--cal-gold)", fontSize: "12px" }}>Services Total:</strong>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>₹{viewingRecord.totalPrice}</div>
                </div>
                <div>
                  <strong style={{ color: "var(--cal-gold)", fontSize: "12px" }}>Advance Paid:</strong>
                  <div style={{ fontSize: "18px" }}>₹{viewingRecord.advance}</div>
                </div>
                <div>
                  <strong style={{ color: "var(--cal-gold)", fontSize: "12px" }}>Travel Fee:</strong>
                  <div style={{ fontSize: "18px" }}>₹{viewingRecord.travelAmount || 0}</div>
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", background: "var(--cal-gold-subtle)", padding: "12px 16px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "var(--cal-gold-dark)", fontFamily: "'Cinzel', serif" }}>Balance Due:</strong>
                <span style={{ fontSize: "20px", fontWeight: "bold", color: "var(--cal-text-dark)" }}>
                  ₹{(Number(viewingRecord.totalPrice) + Number(viewingRecord.travelAmount || 0)) - Number(viewingRecord.advance)}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
              <button
                type="button"
                className="cal-btn-outline"
                onClick={() => {
                  handleOpenEdit(viewingRecord);
                  setViewingRecord(null);
                }}
              >
                ✎ Edit Booking
              </button>
              <button
                type="button"
                className="cal-btn-primary"
                onClick={() => generateMakeupPDF(viewingRecord)}
              >
                📄 Download Invoice
              </button>
              <a
                href={generateGoogleCalendarUrl(viewingRecord)}
                target="_blank"
                rel="noreferrer"
                className="cal-btn-outline"
                style={{ textDecoration: "none" }}
              >
                📅 Google Calendar
              </a>
              {((Number(viewingRecord.totalPrice) + Number(viewingRecord.travelAmount || 0)) - Number(viewingRecord.advance)) > 0 && (
                <button
                  type="button"
                  className="cal-btn-success"
                  onClick={() => handleSettlePayment(viewingRecord)}
                >
                  ✓ Payment Settled
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT BOOKING (Section 9) ── */}
      {showAddModal && (
        <div className="cal-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="cal-modal-box" ref={modalBoxRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "var(--cal-gold-dark)", fontFamily: "'Cinzel', serif", fontSize: "20px", fontWeight: 700 }}>
                {editingId ? "Edit Booking" : "Add New Booking"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", fontSize: "26px", cursor: "pointer", color: "#999" }}
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

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px" }}>
              {/* Client Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontWeight: 600, color: "var(--cal-gold-dark)", fontSize: "13px" }}>
                  Client Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={clientNameInput}
                  onChange={(e) => setClientNameInput(e.target.value)}
                  className={`cal-input-field ${modalErrors.client ? "cal-input-error" : ""}`}
                />
                {modalErrors.client && (
                  <span style={{ color: "var(--cal-danger)", fontSize: "12px", marginTop: "2px" }}>
                    {modalErrors.client}
                  </span>
                )}
              </div>

              {/* Booking Date & Phone */}
              <div className="cal-form-row-2">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: 600, color: "var(--cal-gold-dark)", fontSize: "13px" }}>
                    Booking Date *
                  </label>
                  <input
                    type="date"
                    value={bookingDateInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingDateInput(val);
                      if (!newServiceDate || newServiceDate === bookingDateInput) {
                        setNewServiceDate(val);
                      }
                    }}
                    className={`cal-input-field ${modalErrors.bookingDate ? "cal-input-error" : ""}`}
                  />
                  {modalErrors.bookingDate && (
                    <span style={{ color: "var(--cal-danger)", fontSize: "12px", marginTop: "2px" }}>
                      {modalErrors.bookingDate}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: 600, color: "var(--cal-gold-dark)", fontSize: "13px" }}>
                    Phone No. (10 digits) *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className={`cal-input-field ${modalErrors.phone ? "cal-input-error" : ""}`}
                  />
                  {modalErrors.phone && (
                    <span style={{ color: "var(--cal-danger)", fontSize: "12px", marginTop: "2px" }}>
                      {modalErrors.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Venue & Email */}
              <div className="cal-form-row-2">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: 600, color: "var(--cal-gold-dark)", fontSize: "13px" }}>
                    Venue (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KK Palace, Delhi"
                    value={venueInput}
                    onChange={(e) => setVenueInput(e.target.value)}
                    className="cal-input-field"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: 600, color: "var(--cal-gold-dark)", fontSize: "13px" }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="cal-input-field"
                  />
                </div>
              </div>

              {/* Services Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontWeight: 700, color: "var(--cal-gold-dark)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Services Booked ({newServices.length}) *
                  </label>
                  {modalErrors.services && (
                    <span style={{ color: "var(--cal-danger)", fontSize: "12px", fontWeight: 600 }}>
                      ⚠️ {modalErrors.services}
                    </span>
                  )}
                </div>

                {/* Added Services List */}
                {newServices.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {newServices.map((s, idx) => (
                      <div key={idx} className="cal-service-item-card">
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
                          <span style={{ fontWeight: 600, color: "var(--cal-text-dark)", wordBreak: "break-word" }}>
                            {s.name}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--cal-text-muted)" }}>
                            {s.date ? `📅 ${s.date}` : "⚠️ No date"} • Qty: {s.qty || 1}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                          <strong style={{ color: "var(--cal-gold-dark)", fontSize: "14px" }}>
                            ₹{Number(s.price || 0).toLocaleString("en-IN")}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceItem(idx)}
                            title="Remove service"
                            style={{
                              background: "#feecec",
                              border: "1px solid #f5c2c7",
                              color: "#c62828",
                              cursor: "pointer",
                              borderRadius: "4px",
                              width: "24px",
                              height: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "16px",
                              fontWeight: "bold",
                              padding: 0
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Service Sub-card */}
                <div className="cal-service-add-card">
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--cal-gold-dark)" }}>
                    + Add Service to Booking
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
                      className="cal-input-field"
                    >
                      <option value="">-- Select Service --</option>
                      {serviceOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {selectedServiceOption === 'Custom' && (
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
                        className="cal-input-field"
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
                        className="cal-input-field"
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
                        className="cal-input-field"
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
                        className="cal-input-field"
                      />
                    </div>

                    <button
                      type="button"
                      className="cal-btn-primary"
                      onClick={handleAddServiceItem}
                      style={{ padding: "8px 16px", height: "38px", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      + Add Service
                    </button>
                  </div>

                  {/* Add-on Checkboxes */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "2px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#666" }}>Add-on Options:</span>
                    <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "var(--cal-text-dark)" }}>
                        <input
                          type="checkbox"
                          checked={includeHairstyle}
                          onChange={(e) => setIncludeHairstyle(e.target.checked)}
                          style={{ accentColor: "var(--cal-pink)", width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        + Hairstyle
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "var(--cal-text-dark)" }}>
                        <input
                          type="checkbox"
                          checked={includeLens}
                          onChange={(e) => setIncludeLens(e.target.checked)}
                          style={{ accentColor: "var(--cal-pink)", width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        + Lens
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "var(--cal-text-dark)" }}>
                        <input
                          type="checkbox"
                          checked={includeLashes}
                          onChange={(e) => setIncludeLashes(e.target.checked)}
                          style={{ accentColor: "var(--cal-pink)", width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        + Lashes
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Inputs: 3-column on desktop, responsive wrap on mobile */}
              <div className="cal-form-row-3">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: 600, color: "var(--cal-gold-dark)", fontSize: "13px" }}>Total Price (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={totalPriceInput}
                    onChange={(e) => setTotalPriceInput(e.target.value === "" ? "" : Number(e.target.value))}
                    className="cal-input-field"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: 600, color: "var(--cal-gold-dark)", fontSize: "13px" }}>Advance Paid (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={advanceInput}
                    onChange={(e) => setAdvanceInput(e.target.value === "" ? "" : Number(e.target.value))}
                    className="cal-input-field"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: 600, color: "var(--cal-gold-dark)", fontSize: "13px" }}>Travel Fee (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={travelAmountInput}
                    onChange={(e) => setTravelAmountInput(e.target.value === "" ? "" : Number(e.target.value))}
                    className="cal-input-field"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #eee", paddingTop: "14px", marginTop: "4px" }}>
              <button
                type="button"
                className="cal-btn-outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cal-btn-add"
                onClick={handleSaveBooking}
              >
                {editingId ? "Update Booking" : "Create Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {deleteConfirmId && (
        <div className="cal-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="cal-modal-box" style={{ maxWidth: "380px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "36px", color: "var(--cal-danger)", marginBottom: "8px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px 0", fontFamily: "'Cinzel', serif" }}>Confirm Deletion</h3>
            <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.4", margin: "0 0 20px 0" }}>
              Are you sure you want to delete this booking? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="cal-btn-outline"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cal-btn-danger"
                style={{ flex: 1, justifyContent: "center", background: "var(--cal-danger)", color: "#fff" }}
                onClick={() => handleDeleteBooking(deleteConfirmId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
