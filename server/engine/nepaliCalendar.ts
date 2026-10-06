/**
 * Nepal Standard Time (NPT) is UTC + 5 hours 45 minutes
 */
export function getNepalDateTime(): Date {
  const now = new Date();
  const utcOffset = now.getTime() + (now.getTimezoneOffset() * 60000);
  const nepalOffset = 5.75 * 3600000; // 5 hours 45 minutes
  return new Date(utcOffset + nepalOffset);
}

export function formatNepalDateTime(date?: Date): string {
  const d = date || getNepalDateTime();
  const pad = (n: number) => String(n).padStart(2, '0');
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  return `${year}-${month}-${day} ${pad(hours)}:${minutes} ${ampm} NPT`;
}

export type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_OPEN';

export interface MarketSessionInfo {
  status: MarketStatus;
  statusLabelEn: string;
  statusLabelNe: string;
  currentTimeNPT: string;
  isTradingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  nextSessionText: string;
  nextSessionDateNPT: string;
}

// Known NEPSE Trading Calendar Holidays (Gregorian ISO dates for standard calendar mapping)
const NEPSE_HOLIDAYS_MAP: Record<string, string> = {
  // Major NEPSE Gazetted Holidays
  '2024-01-15': 'Maghe Sankranti',
  '2024-01-30': 'Martyrs Day',
  '2024-02-19': 'National Democracy Day',
  '2024-03-08': 'Maha Shivaratri',
  '2024-03-24': 'Fagu Purnima (Holi)',
  '2024-04-14': 'Nepali New Year (Baisakh 1)',
  '2024-05-01': 'International Labour Day',
  '2024-05-23': 'Buddha Jayanti',
  '2024-09-19': 'Constitution Day',
  '2024-10-10': 'Ghatasthapana (Dashain)',
  '2024-10-13': 'Fulpati (Dashain)',
  '2024-10-14': 'Maha Ashtami (Dashain)',
  '2024-10-15': 'Maha Navami (Dashain)',
  '2024-10-16': 'Vijaya Dashami (Dashain)',
  '2024-10-31': 'Laxmi Puja (Tihar)',
  '2024-11-01': 'Govardhan Puja (Tihar)',
  '2024-11-03': 'Bhai Tika (Tihar)',
  '2025-01-14': 'Maghe Sankranti',
  '2025-02-26': 'Maha Shivaratri',
  '2025-03-13': 'Fagu Purnima (Holi)',
  '2025-04-14': 'Nepali New Year',
  '2026-01-15': 'Maghe Sankranti',
  '2026-03-04': 'Maha Shivaratri',
  '2026-04-14': 'Nepali New Year'
};

export function checkNepseHoliday(date: Date): { isHoliday: boolean; holidayName?: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (NEPSE_HOLIDAYS_MAP[key]) {
    return { isHoliday: true, holidayName: NEPSE_HOLIDAYS_MAP[key] };
  }
  return { isHoliday: false };
}

export function getNextTradingSessionDate(currentNpt: Date): { nextDate: Date; dateStr: string; labelEn: string; labelNe: string } {
  const next = new Date(currentNpt.getTime());
  
  // Advance day by day until we find a Sunday-Thursday (days 0-4) that is NOT a holiday
  let attempts = 0;
  while (attempts < 14) {
    attempts++;
    next.setDate(next.getDate() + 1);
    const day = next.getDay();
    if (day >= 0 && day <= 4) {
      const hol = checkNepseHoliday(next);
      if (!hol.isHoliday) {
        break;
      }
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesNe = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
  
  const targetDay = next.getDay();
  const dateStr = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;

  return {
    nextDate: next,
    dateStr,
    labelEn: `${dayNames[targetDay]} (${dateStr}) at 11:00 AM NPT`,
    labelNe: `${dayNamesNe[targetDay]} (${dateStr}) बिहान ११:०० बजे NPT`
  };
}

export function getNepseMarketStatus(): MarketSessionInfo {
  const npt = getNepalDateTime();
  const day = npt.getDay(); // 0 is Sunday, 4 is Thursday, 5 is Friday, 6 is Saturday
  const isDayOfWeekTrading = day >= 0 && day <= 4;
  const holidayCheck = checkNepseHoliday(npt);

  const hours = npt.getHours();
  const minutes = npt.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const preOpenStart = 10 * 60 + 30; // 10:30 AM
  const preOpenEnd = 10 * 60 + 45;   // 10:45 AM
  const openStart = 11 * 60;          // 11:00 AM
  const openEnd = 15 * 60;            // 3:00 PM

  let status: MarketStatus = 'CLOSED';
  let statusLabelEn = 'Market Closed';
  let statusLabelNe = 'बजार बन्द';
  
  const nextSession = getNextTradingSessionDate(npt);
  let nextSessionText = `Next session: ${nextSession.labelEn}`;

  const isTradingDay = isDayOfWeekTrading && !holidayCheck.isHoliday;

  if (isTradingDay) {
    if (totalMinutes >= preOpenStart && totalMinutes < preOpenEnd) {
      status = 'PRE_OPEN';
      statusLabelEn = 'Pre-Open Session';
      statusLabelNe = 'प्रि-ओपन सत्र';
      nextSessionText = 'Continuous trading starts at 11:00 AM NPT';
    } else if (totalMinutes >= openStart && totalMinutes < openEnd) {
      status = 'OPEN';
      statusLabelEn = 'Market Open';
      statusLabelNe = 'बजार खुला';
      nextSessionText = 'Continuous session closes today at 3:00 PM NPT';
    } else if (totalMinutes < preOpenStart) {
      status = 'CLOSED';
      statusLabelEn = 'Market Closed (Opens 11:00 AM)';
      statusLabelNe = 'बजार बन्द (११:०० बजे खुल्छ)';
      nextSessionText = 'Continuous trading opens today at 11:00 AM NPT';
    } else {
      status = 'CLOSED';
      statusLabelEn = 'Market Closed';
      statusLabelNe = 'बजार बन्द';
      nextSessionText = `Next session: ${nextSession.labelEn}`;
    }
  } else if (holidayCheck.isHoliday) {
    status = 'CLOSED';
    statusLabelEn = `Market Closed (${holidayCheck.holidayName})`;
    statusLabelNe = `बजार बन्द (${holidayCheck.holidayName})`;
    nextSessionText = `Next session: ${nextSession.labelEn}`;
  } else {
    status = 'CLOSED';
    statusLabelEn = 'Market Closed (Weekend)';
    statusLabelNe = 'बजार बन्द (सप्ताहन्त)';
    nextSessionText = `Next session: ${nextSession.labelEn}`;
  }

  return {
    status,
    statusLabelEn,
    statusLabelNe,
    currentTimeNPT: formatNepalDateTime(npt),
    isTradingDay,
    isHoliday: holidayCheck.isHoliday,
    holidayName: holidayCheck.holidayName,
    nextSessionText,
    nextSessionDateNPT: nextSession.dateStr
  };
}

/**
 * Format currency into standard Nepali Rupees with NPR symbol and proper locale grouping
 */
export function formatNPR(amount: number, options?: { showPrefix?: boolean; decimals?: number }): string {
  const { showPrefix = true, decimals = 2 } = options || {};
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return showPrefix ? `NPR ${formatted}` : formatted;
}
