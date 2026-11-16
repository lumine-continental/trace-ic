import {
  AdvisorItem,
  buildDefaultWhatsAppMessage,
  CareerItem,
  CHANNEL_BASE_SLUGS,
  ChannelKey,
  generateDeterministicShortCode,
  isValidPeriodCode,
  LinkItem,
  PeriodItem,
  sanitizeCampaignInput,
  SubcampaignRecord,
  SubchannelItem,
  WhatsAppNumberItem,
} from '../types/trace';

const STORAGE_KEYS = {
  PERIODS: 'trace_ic_v8_periods',
  CAMPAIGNS: 'trace_ic_v8_campaigns',
  CAREERS: 'trace_ic_v8_careers',
  SUBCHANNELS: 'trace_ic_v8_subchannels',
  ADVISORS: 'trace_ic_v8_advisors',
  LINKS: 'trace_ic_v8_links',
  RECORDS: 'trace_ic_v8_records',
  WA_NUMBERS: 'trace_ic_v8_wa',
};

const INITIAL_PERIODS: PeriodItem[] = [
  { id: 1, code: '202610', is_active: false, usage_count: 0 },
  { id: 2, code: '202620', is_active: false, usage_count: 0 },
  { id: 3, code: '202710', is_active: true, usage_count: 10 },
  { id: 4, code: '202720', is_active: false, usage_count: 2 },
];

const INITIAL_CAMPAIGNS: string[] = [
  'PRESENCIAL',
  'SEMIPRESENCIAL',
  'A_DISTANCIA',
  'EVENTOS',
];

const INITIAL_CAREERS: CareerItem[] = [
  { id: 1, name: 'Diseño de Modas' },
  { id: 2, name: 'Contabilidad' },
  { id: 3, name: 'Enfermería Técnica' },
  { id: 4, name: 'Desarrollo de Sistemas de Información' },
  { id: 5, name: 'Administración de Empresas' },
  { id: 6, name: 'Diseño Gráfico Publicitario' },
  { id: 7, name: 'Gastronomía' },
  { id: 8, name: 'Información General de Carreras' },
];

const INITIAL_SUBCHANNELS: SubchannelItem[] = [
  { id: 1, channel: 'web_institucional', name: 'portal-web' },
  { id: 2, channel: 'web_institucional', name: 'landing-page' },
  { id: 3, channel: 'link_ads', name: 'tiktok-ads' },
  { id: 4, channel: 'link_ads', name: 'google-search' },
  { id: 5, channel: 'link_ads', name: 'google-display' },
  { id: 6, channel: 'link_ads', name: 'google-pmax' },
  { id: 7, channel: 'link_ads', name: 'google-youtube' },
  { id: 8, channel: 'link_ads', name: 'linkedin-ads' },
  { id: 9, channel: 'mailing_sms_chattigo', name: 'mail' },
  { id: 10, channel: 'mailing_sms_chattigo', name: 'sms' },
  { id: 11, channel: 'mailing_sms_chattigo', name: 'whatsapp' },
];

const INITIAL_ADVISORS: AdvisorItem[] = [
  { id: 1, name: 'Gerber', phone_number: '51987654321' },
  { id: 2, name: 'Lucia', phone_number: '51987654322' },
];

const INITIAL_WA_NUMBERS: WhatsAppNumberItem[] = [
  {
    id: 1,
    label: 'WhatsApp Admisión Pregrado',
    phone_number: '51987654321',
    department: 'Admisión Pregrado',
    default_greeting: 'Hola, quisiera más información en el Instituto y Escuela Superior Continental.',
  },
  {
    id: 2,
    label: 'WhatsApp Educación Continua',
    phone_number: '51987654322',
    department: 'Educación Continua',
    default_greeting: 'Hola, quisiera más información en el Instituto y Escuela Superior Continental.',
  },
  {
    id: 3,
    label: 'WhatsApp Atención Becas',
    phone_number: '51987654323',
    department: 'Becas',
    default_greeting: 'Hola, quisiera más información en el Instituto y Escuela Superior Continental.',
  },
];

const INITIAL_LINKS: LinkItem[] = [
  {
    id: 1,
    slug: 'organico?subcanal=portal-web&campana=PRESENCIAL&carrera=Dise%C3%B1o%20de%20Modas&periodo=202710',
    short_code: 'ic-pw2710',
    short_url: 'https://trace.icontinental.edu.pe/ic-pw2710',
    normal_url:
      'https://trace.icontinental.edu.pe/organico?subcanal=portal-web&campana=PRESENCIAL&carrera=Dise%C3%B1o%20de%20Modas&periodo=202710',
    title: 'PRESENCIAL_202710 - Diseño de Modas',
    channel: 'web_institucional',
    period: '202710',
    campaign: 'PRESENCIAL',
    career: 'Diseño de Modas',
    subcampaign: 'portal-web',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message:
      'Hola, vengo de Orgánico, quisiera más información sobre Diseño de Modas, en el Instituto y Escuela Superior Continental. Mi código de atención es PORTAL-WEB_202710',
    is_master_route: true,
    total_clicks: 418,
    unique_visitors: 365,
    created_at: '2026-11-01',
  },
  {
    id: 2,
    slug: 'nurturing?subcanal=whatsapp&campana=SEMIPRESENCIAL&carrera=Contabilidad&periodo=202710',
    short_code: 'ic-wa2710',
    short_url: 'https://trace.icontinental.edu.pe/ic-wa2710',
    normal_url:
      'https://trace.icontinental.edu.pe/nurturing?subcanal=whatsapp&campana=SEMIPRESENCIAL&carrera=Contabilidad&periodo=202710',
    title: 'SEMIPRESENCIAL_202710 - Contabilidad',
    channel: 'mailing_sms_chattigo',
    period: '202710',
    campaign: 'SEMIPRESENCIAL',
    career: 'Contabilidad',
    subcampaign: 'whatsapp',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message:
      'Hola, vengo de Nurturing, quisiera más información sobre Contabilidad, en el Instituto y Escuela Superior Continental. Mi código de atención es WHATSAPP_202710',
    is_master_route: true,
    total_clicks: 420,
    unique_visitors: 378,
    created_at: '2026-11-02',
  },
  {
    id: 3,
    slug: 'pauta?subcanal=tiktok-ads&campana=PRESENCIAL&carrera=Dise%C3%B1o%20de%20Modas&periodo=202710',
    short_code: 'ic-tt2710',
    short_url: 'https://trace.icontinental.edu.pe/ic-tt2710',
    normal_url:
      'https://trace.icontinental.edu.pe/pauta?subcanal=tiktok-ads&campana=PRESENCIAL&carrera=Dise%C3%B1o%20de%20Modas&periodo=202710',
    title: 'PRESENCIAL_202710 - Diseño de Modas',
    channel: 'link_ads',
    period: '202710',
    campaign: 'PRESENCIAL',
    career: 'Diseño de Modas',
    subcampaign: 'tiktok-ads',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message:
      'Hola, vengo de Pauta, quisiera más información sobre Diseño de Modas, en el Instituto y Escuela Superior Continental. Mi código de atención es TIKTOK-ADS_202710',
    total_clicks: 685,
    unique_visitors: 604,
    created_at: '2026-11-05',
  },
  {
    id: 4,
    slug: 'pauta?subcanal=google-pmax&campana=A_DISTANCIA&carrera=Desarrollo%20de%20Sistemas%20de%20Informaci%C3%B3n&periodo=202710',
    short_code: 'ic-pm2710',
    short_url: 'https://trace.icontinental.edu.pe/ic-pm2710',
    normal_url:
      'https://trace.icontinental.edu.pe/pauta?subcanal=google-pmax&campana=A_DISTANCIA&carrera=Desarrollo%20de%20Sistemas%20de%20Informaci%C3%B3n&periodo=202710',
    title: 'A_DISTANCIA_202710 - Desarrollo de Sistemas de Información',
    channel: 'link_ads',
    period: '202710',
    campaign: 'A_DISTANCIA',
    career: 'Desarrollo de Sistemas de Información',
    subcampaign: 'google-pmax',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654322',
    whatsapp_message:
      'Hola, vengo de Pauta, quisiera más información sobre Desarrollo de Sistemas de Información, en el Instituto y Escuela Superior Continental. Mi código de atención es GOOGLE-PMAX_202710',
    total_clicks: 520,
    unique_visitors: 465,
    created_at: '2026-11-08',
  },
  {
    id: 5,
    slug: 'asesor?subcanal=Gerber&campana=EVENTOS&carrera=Gastronom%C3%ADa&periodo=202710',
    short_code: 'ic-ge2710',
    short_url: 'https://trace.icontinental.edu.pe/ic-ge2710',
    normal_url:
      'https://trace.icontinental.edu.pe/asesor?subcanal=Gerber&campana=EVENTOS&carrera=Gastronom%C3%ADa&periodo=202710',
    title: 'EVENTOS_202710 - Gastronomía (Gerber)',
    channel: 'asesor_prospector',
    period: '202710',
    campaign: 'EVENTOS',
    career: 'Gastronomía',
    subcampaign: 'Gerber',
    advisor_name: 'Gerber',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message:
      'Hola Gerber, vengo de Asesor / Prospector, quisiera más información sobre Gastronomía, en el Instituto y Escuela Superior Continental. Mi código de atención es EVENTOS_202710',
    total_clicks: 530,
    unique_visitors: 472,
    created_at: '2026-11-10',
  },
];

const INITIAL_RECORDS: SubcampaignRecord[] = [
  // 1. ORGÁNICO
  {
    id: 'web_institucional::202710::PRESENCIAL::Diseño de Modas::portal-web',
    channel: 'web_institucional',
    period: '202710',
    campaign: 'PRESENCIAL',
    career: 'Diseño de Modas',
    subcampaign: 'portal-web',
    whatsapp_phone: '51987654321',
    short_link: 'trace.icontinental.edu.pe/ic-pw2710',
    clicks: 418,
    unique_visitors: 365,
    last_activity_date: '2026-11-15',
  },
  {
    id: 'web_institucional::202710::PRESENCIAL::Contabilidad::portal-web',
    channel: 'web_institucional',
    period: '202710',
    campaign: 'PRESENCIAL',
    career: 'Contabilidad',
    subcampaign: 'portal-web',
    whatsapp_phone: '51987654321',
    short_link: 'trace.icontinental.edu.pe/ic-pw2711',
    clicks: 384,
    unique_visitors: 332,
    last_activity_date: '2026-11-14',
  },
  {
    id: 'web_institucional::202710::SEMIPRESENCIAL::Enfermería Técnica::landing-page',
    channel: 'web_institucional',
    period: '202710',
    campaign: 'SEMIPRESENCIAL',
    career: 'Enfermería Técnica',
    subcampaign: 'landing-page',
    whatsapp_phone: '51987654321',
    short_link: 'trace.icontinental.edu.pe/ic-lp2712',
    clicks: 356,
    unique_visitors: 310,
    last_activity_date: '2026-11-13',
  },
  {
    id: 'web_institucional::202710::A_DISTANCIA::Desarrollo de Sistemas de Información::portal-web',
    channel: 'web_institucional',
    period: '202710',
    campaign: 'A_DISTANCIA',
    career: 'Desarrollo de Sistemas de Información',
    subcampaign: 'portal-web',
    whatsapp_phone: '51987654322',
    short_link: 'trace.icontinental.edu.pe/ic-pw2713',
    clicks: 298,
    unique_visitors: 254,
    last_activity_date: '2026-11-11',
  },

  // 2. PAUTA
  {
    id: 'link_ads::202710::PRESENCIAL::Diseño de Modas::tiktok-ads',
    channel: 'link_ads',
    period: '202710',
    campaign: 'PRESENCIAL',
    career: 'Diseño de Modas',
    subcampaign: 'tiktok-ads',
    whatsapp_phone: '51987654321',
    short_link: 'trace.icontinental.edu.pe/ic-tt2710',
    clicks: 685,
    unique_visitors: 604,
    last_activity_date: '2026-11-15',
  },
  {
    id: 'link_ads::202710::A_DISTANCIA::Desarrollo de Sistemas de Información::google-pmax',
    channel: 'link_ads',
    period: '202710',
    campaign: 'A_DISTANCIA',
    career: 'Desarrollo de Sistemas de Información',
    subcampaign: 'google-pmax',
    whatsapp_phone: '51987654322',
    short_link: 'trace.icontinental.edu.pe/ic-pm2710',
    clicks: 520,
    unique_visitors: 465,
    last_activity_date: '2026-11-14',
  },
  {
    id: 'link_ads::202710::SEMIPRESENCIAL::Administración de Empresas::google-display',
    channel: 'link_ads',
    period: '202710',
    campaign: 'SEMIPRESENCIAL',
    career: 'Administración de Empresas',
    subcampaign: 'google-display',
    whatsapp_phone: '51987654321',
    short_link: 'trace.icontinental.edu.pe/ic-gd2710',
    clicks: 490,
    unique_visitors: 430,
    last_activity_date: '2026-11-12',
  },
  {
    id: 'link_ads::202720::EVENTOS::Contabilidad::google-youtube',
    channel: 'link_ads',
    period: '202720',
    campaign: 'EVENTOS',
    career: 'Contabilidad',
    subcampaign: 'google-youtube',
    whatsapp_phone: '51987654323',
    short_link: 'trace.icontinental.edu.pe/ic-yt2720',
    clicks: 310,
    unique_visitors: 275,
    last_activity_date: '2026-11-06',
  },

  // 3. NURTURING
  {
    id: 'mailing_sms_chattigo::202710::SEMIPRESENCIAL::Contabilidad::whatsapp',
    channel: 'mailing_sms_chattigo',
    period: '202710',
    campaign: 'SEMIPRESENCIAL',
    career: 'Contabilidad',
    subcampaign: 'whatsapp',
    whatsapp_phone: '51987654321',
    short_link: 'trace.icontinental.edu.pe/ic-wa2710',
    clicks: 420,
    unique_visitors: 378,
    last_activity_date: '2026-11-15',
  },
  {
    id: 'mailing_sms_chattigo::202710::PRESENCIAL::Enfermería Técnica::sms',
    channel: 'mailing_sms_chattigo',
    period: '202710',
    campaign: 'PRESENCIAL',
    career: 'Enfermería Técnica',
    subcampaign: 'sms',
    whatsapp_phone: '51987654321',
    short_link: 'trace.icontinental.edu.pe/ic-sm2710',
    clicks: 392,
    unique_visitors: 350,
    last_activity_date: '2026-11-11',
  },
  {
    id: 'mailing_sms_chattigo::202710::EVENTOS::Gastronomía::mail',
    channel: 'mailing_sms_chattigo',
    period: '202710',
    campaign: 'EVENTOS',
    career: 'Gastronomía',
    subcampaign: 'mail',
    whatsapp_phone: '51987654322',
    short_link: 'trace.icontinental.edu.pe/ic-ml2710',
    clicks: 195,
    unique_visitors: 160,
    last_activity_date: '2026-11-04',
  },

  // 4. ASESOR / PROSPECTOR
  {
    id: 'asesor_prospector::202710::EVENTOS::Gastronomía::Gerber',
    channel: 'asesor_prospector',
    period: '202710',
    campaign: 'EVENTOS',
    career: 'Gastronomía',
    subcampaign: 'Gerber',
    advisor_name: 'Gerber',
    whatsapp_phone: '51987654321',
    short_link: 'trace.icontinental.edu.pe/ic-ge2710',
    clicks: 530,
    unique_visitors: 472,
    last_activity_date: '2026-11-15',
  },
  {
    id: 'asesor_prospector::202710::PRESENCIAL::Diseño Gráfico Publicitario::Lucia',
    channel: 'asesor_prospector',
    period: '202710',
    campaign: 'PRESENCIAL',
    career: 'Diseño Gráfico Publicitario',
    subcampaign: 'Lucia',
    advisor_name: 'Lucia',
    whatsapp_phone: '51987654322',
    short_link: 'trace.icontinental.edu.pe/ic-lu2710',
    clicks: 215,
    unique_visitors: 188,
    last_activity_date: '2026-11-08',
  },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 2500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function buildSystemTrackingUrl(params: {
  channel: ChannelKey;
  campaign: string;
  career: string;
  period: string;
  subchannel: string;
}): string {
  const baseSlug = CHANNEL_BASE_SLUGS[params.channel];
  const camp = encodeURIComponent(sanitizeCampaignInput(params.campaign) || 'PRESENCIAL');
  const car = encodeURIComponent(params.career.trim() || 'Diseño de Modas');
  const per = encodeURIComponent(params.period || '202710');
  const sub = encodeURIComponent(params.subchannel.trim() || 'portal-web');
  return `https://trace.icontinental.edu.pe/${baseSlug}?subcanal=${sub}&campana=${camp}&carrera=${car}&periodo=${per}`;
}

export class DataEngine {
  private static onSyncCallback: (() => void) | null = null;

  static setOnSync(cb: () => void): void {
    this.onSyncCallback = cb;
  }

  private static notify(): void {
    if (this.onSyncCallback) {
      this.onSyncCallback();
    }
  }

  static async syncFromServer(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout('/api/state', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (Array.isArray(data.periods)) {
        saveToStorage(STORAGE_KEYS.PERIODS, data.periods);
      }
      if (Array.isArray(data.campaigns)) {
        saveToStorage(STORAGE_KEYS.CAMPAIGNS, data.campaigns);
      }
      if (Array.isArray(data.careers)) {
        saveToStorage(STORAGE_KEYS.CAREERS, data.careers);
      }
      if (Array.isArray(data.subchannels)) {
        saveToStorage(STORAGE_KEYS.SUBCHANNELS, data.subchannels);
      }
      if (Array.isArray(data.advisors)) {
        saveToStorage(STORAGE_KEYS.ADVISORS, data.advisors);
      }
      if (Array.isArray(data.whatsapp_numbers)) {
        saveToStorage(STORAGE_KEYS.WA_NUMBERS, data.whatsapp_numbers);
      }
      if (Array.isArray(data.links)) {
        saveToStorage(STORAGE_KEYS.LINKS, data.links);
      }
      if (Array.isArray(data.records)) {
        saveToStorage(STORAGE_KEYS.RECORDS, data.records);
      }
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  static getPeriods(): PeriodItem[] {
    const periods = loadFromStorage<PeriodItem[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
    const links = this.getLinks();
    const records = this.getRecords();
    return periods.map((p) => {
      const usedLinks = links.filter((l) => !l.is_master_route && l.period === p.code).length;
      const usedRecords = records.filter((r) => r.period === p.code && r.clicks > 0).length;
      return {
        ...p,
        usage_count: Math.max(p.usage_count || 0, usedLinks + usedRecords),
      };
    });
  }

  static getActivePeriod(): string {
    const periods = this.getPeriods();
    const active = periods.find((p) => p.is_active);
    return active ? active.code : periods[0]?.code || '202710';
  }

  static getCampaigns(): string[] {
    return loadFromStorage<string[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  }

  static getCareers(): CareerItem[] {
    return loadFromStorage<CareerItem[]>(STORAGE_KEYS.CAREERS, INITIAL_CAREERS);
  }

  static getSubchannels(): SubchannelItem[] {
    return loadFromStorage<SubchannelItem[]>(STORAGE_KEYS.SUBCHANNELS, INITIAL_SUBCHANNELS);
  }

  static getAdvisors(): AdvisorItem[] {
    return loadFromStorage<AdvisorItem[]>(STORAGE_KEYS.ADVISORS, INITIAL_ADVISORS);
  }

  static getLinks(): LinkItem[] {
    const raw = loadFromStorage<LinkItem[]>(STORAGE_KEYS.LINKS, INITIAL_LINKS);
    return raw.map((l) => {
      const sc = l.short_code || generateDeterministicShortCode(`${l.id}|${l.slug}`);
      return {
        ...l,
        short_code: sc,
        short_url: `https://trace.icontinental.edu.pe/${sc}`,
      };
    });
  }

  static getRecords(): SubcampaignRecord[] {
    return loadFromStorage<SubcampaignRecord[]>(STORAGE_KEYS.RECORDS, INITIAL_RECORDS);
  }

  static getWhatsAppNumbers(): WhatsAppNumberItem[] {
    return loadFromStorage<WhatsAppNumberItem[]>(STORAGE_KEYS.WA_NUMBERS, INITIAL_WA_NUMBERS);
  }

  static async login(
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'admin@icontinental.edu.pe' && password === 'TraceIC2026!') {
      fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      }).catch(() => {});
      return { ok: true };
    }

    try {
      const res = await fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      if (res.ok) {
        return { ok: true };
      }
      const errData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: errData.error || 'Usuario o contraseña incorrectos.',
      };
    } catch {
      return {
        ok: false,
        error: 'Usuario o contraseña incorrectos.',
      };
    }
  }

  // ===========================================================================
  // GESTIÓN DE CAMPAÑAS (En Configuración)
  // ===========================================================================
  static async createCampaign(rawName: string): Promise<void> {
    const clean = sanitizeCampaignInput(rawName);
    if (!clean) return;
    const list = this.getCampaigns();
    if (!list.includes(clean)) {
      saveToStorage(STORAGE_KEYS.CAMPAIGNS, [...list, clean].sort());
      this.notify();
    }

    try {
      await fetchWithTimeout('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async deleteCampaign(name: string): Promise<void> {
    const list = this.getCampaigns().filter((c) => c !== name);
    saveToStorage(STORAGE_KEYS.CAMPAIGNS, list);
    this.notify();

    try {
      await fetchWithTimeout('/api/campaigns/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  // ===========================================================================
  // GESTIÓN JERÁRQUICA DE SUBCANALES POR CANAL
  // ===========================================================================
  static async createSubchannel(channel: ChannelKey, name: string): Promise<void> {
    const cleanName = name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '');
    if (!cleanName) return;

    const list = this.getSubchannels();
    if (
      !list.some(
        (s) => s.channel === channel && s.name.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      const newItem: SubchannelItem = {
        id: Math.max(0, ...list.map((s) => s.id)) + 1,
        channel,
        name: cleanName,
      };
      saveToStorage(STORAGE_KEYS.SUBCHANNELS, [...list, newItem]);
      this.notify();
    }

    try {
      await fetchWithTimeout('/api/subchannels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, name: cleanName }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async deleteSubchannel(id: number): Promise<void> {
    const list = this.getSubchannels().filter((s) => s.id !== id);
    saveToStorage(STORAGE_KEYS.SUBCHANNELS, list);
    this.notify();

    try {
      await fetchWithTimeout('/api/subchannels/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  // ===========================================================================
  // GESTIÓN DE CARRERAS
  // ===========================================================================
  static async createCareer(name: string): Promise<void> {
    const cleanName = name.trim();
    if (!cleanName) return;
    const list = this.getCareers();
    if (!list.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      const newItem: CareerItem = {
        id: Math.max(0, ...list.map((c) => c.id)) + 1,
        name: cleanName,
      };
      saveToStorage(STORAGE_KEYS.CAREERS, [...list, newItem]);
      this.notify();
    }

    try {
      await fetchWithTimeout('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async deleteCareer(id: number): Promise<void> {
    const list = this.getCareers().filter((c) => c.id !== id);
    saveToStorage(STORAGE_KEYS.CAREERS, list);
    this.notify();

    try {
      await fetchWithTimeout('/api/careers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  // ===========================================================================
  // GESTIÓN DE PERIODOS GLOBALES
  // ===========================================================================
  static async createPeriod(code: string, setActive = true): Promise<void> {
    const clean = code.trim();
    if (!isValidPeriodCode(clean)) {
      throw new Error('El Periodo debe tener formato Año + 10, 20 o 30 (ej: 202610, 202720).');
    }

    let list = this.getPeriods();
    if (setActive) {
      list = list.map((p) => ({ ...p, is_active: false }));
    }
    const exists = list.some((p) => p.code === clean);
    if (exists) {
      list = list.map((p) => (p.code === clean ? { ...p, is_active: setActive ? true : p.is_active } : p));
    } else {
      list.push({
        id: Math.max(0, ...list.map((p) => p.id)) + 1,
        code: clean,
        is_active: setActive,
        usage_count: 0,
      });
    }
    list.sort((a, b) => a.code.localeCompare(b.code));
    saveToStorage(STORAGE_KEYS.PERIODS, list);
    this.notify();

    try {
      await fetchWithTimeout('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean, set_active: setActive }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async activatePeriod(code: string): Promise<void> {
    const list = this.getPeriods().map((p) => ({
      ...p,
      is_active: p.code === code,
    }));
    saveToStorage(STORAGE_KEYS.PERIODS, list);
    this.notify();

    try {
      await fetchWithTimeout('/api/periods/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async deletePeriod(code: string): Promise<void> {
    const periods = this.getPeriods();
    const target = periods.find((p) => p.code === code);
    if (!target) return;
    if (target.usage_count > 0) {
      throw new Error(
        `El periodo ${code} está en uso (${target.usage_count} registros). Limpia primero sus enlaces o conteos.`
      );
    }
    if (target.is_active) {
      throw new Error('No puedes eliminar el Periodo Activo Global.');
    }

    const updated = periods.filter((p) => p.code !== code);
    saveToStorage(STORAGE_KEYS.PERIODS, updated);
    this.notify();

    try {
      await fetchWithTimeout('/api/periods/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  // ===========================================================================
  // GESTIÓN DE ASESORES / PROSPECTORES
  // ===========================================================================
  static async saveAdvisor(payload: {
    id?: number;
    name: string;
    phone_number: string;
  }): Promise<void> {
    const list = this.getAdvisors();
    const cleanName = payload.name.trim();
    const cleanPhone = payload.phone_number.replace(/\D/g, '');
    if (payload.id) {
      const updated = list.map((a) =>
        a.id === payload.id ? { ...a, name: cleanName, phone_number: cleanPhone } : a
      );
      saveToStorage(STORAGE_KEYS.ADVISORS, updated);
    } else {
      const newItem: AdvisorItem = {
        id: Math.max(0, ...list.map((a) => a.id)) + 1,
        name: cleanName,
        phone_number: cleanPhone,
      };
      saveToStorage(STORAGE_KEYS.ADVISORS, [...list, newItem]);
    }
    this.notify();

    try {
      await fetchWithTimeout('/api/advisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payload.id,
          name: cleanName,
          phone_number: cleanPhone,
        }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async deleteAdvisor(id: number): Promise<void> {
    const list = this.getAdvisors().filter((a) => a.id !== id);
    saveToStorage(STORAGE_KEYS.ADVISORS, list);
    this.notify();

    try {
      await fetchWithTimeout('/api/advisors/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  // ===========================================================================
  // CREACIÓN Y ELIMINACIÓN DE ENLACES
  // ===========================================================================
  static async createLink(payload: {
    channel: ChannelKey;
    period: string;
    campaign: string;
    career: string;
    subcampaign: string;
    advisor_name?: string;
    whatsapp_phone: string;
    whatsapp_message: string;
    is_purgeable?: boolean;
  }): Promise<LinkItem> {
    const links = this.getLinks();
    const records = this.getRecords();
    const campaigns = this.getCampaigns();

    const cleanCamp = sanitizeCampaignInput(payload.campaign) || 'PRESENCIAL';
    if (!campaigns.includes(cleanCamp)) {
      saveToStorage(STORAGE_KEYS.CAMPAIGNS, [...campaigns, cleanCamp].sort());
    }

    const normalUrl = buildSystemTrackingUrl({
      channel: payload.channel,
      campaign: cleanCamp,
      career: payload.career,
      period: payload.period,
      subchannel: payload.subcampaign,
    });

    const finalSlug = normalUrl.replace('https://trace.icontinental.edu.pe/', '');
    const today = new Date().toISOString().slice(0, 10);
    const isPurgeable = Boolean(payload.is_purgeable);
    const shortCode = generateDeterministicShortCode(`${finalSlug}|${Date.now()}`);

    const newLink: LinkItem = {
      id: Math.max(0, ...links.map((l) => l.id)) + 1,
      slug: finalSlug,
      short_code: shortCode,
      short_url: `https://trace.icontinental.edu.pe/${shortCode}`,
      normal_url: normalUrl,
      title: `${cleanCamp}_${payload.period} — ${payload.career}`,
      channel: payload.channel,
      period: payload.period,
      campaign: cleanCamp,
      career: payload.career,
      subcampaign: payload.subcampaign.trim() || 'portal-web',
      advisor_name: payload.advisor_name || null,
      destination_type: 'whatsapp',
      destination_url: null,
      whatsapp_phone: payload.whatsapp_phone || '51987654321',
      whatsapp_message:
        payload.whatsapp_message ||
        buildDefaultWhatsAppMessage({
          channel: payload.channel,
          campaign: cleanCamp,
          career: payload.career,
          period: payload.period,
          subchannel: payload.subcampaign,
          advisorName: payload.advisor_name,
        }),
      is_purgeable: isPurgeable,
      total_clicks: 0,
      unique_visitors: 0,
      created_at: today,
    };

    const recKey = `${newLink.channel}::${newLink.period}::${newLink.campaign}::${newLink.career}::${newLink.subcampaign}`;
    const newRecord: SubcampaignRecord = {
      id: recKey,
      channel: newLink.channel,
      period: newLink.period,
      campaign: newLink.campaign,
      career: newLink.career,
      subcampaign: newLink.subcampaign,
      advisor_name: newLink.advisor_name,
      whatsapp_phone: newLink.whatsapp_phone,
      short_link: `trace.icontinental.edu.pe/${newLink.short_code}`,
      clicks: 0,
      unique_visitors: 0,
      last_activity_date: today,
      is_purgeable: isPurgeable,
    };

    saveToStorage(STORAGE_KEYS.LINKS, [newLink, ...links]);
    if (!records.some((r) => r.id === recKey)) {
      saveToStorage(STORAGE_KEYS.RECORDS, [newRecord, ...records]);
    }
    this.notify();

    try {
      await fetchWithTimeout('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }

    return newLink;
  }

  static async deleteLink(id: number): Promise<void> {
    const allLinks = this.getLinks();
    const target = allLinks.find((l) => l.id === id);
    const links = allLinks.filter((l) => l.id !== id);
    saveToStorage(STORAGE_KEYS.LINKS, links);

    if (target) {
      const recKey = `${target.channel}::${target.period}::${target.campaign}::${target.career}::${target.subcampaign}`;
      const records = this.getRecords().filter((r) => r.id !== recKey);
      saveToStorage(STORAGE_KEYS.RECORDS, records);
    }
    this.notify();

    try {
      await fetchWithTimeout('/api/links/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async saveWhatsAppNumber(payload: {
    id?: number;
    label: string;
    phone_number: string;
    department: string;
    default_greeting: string;
  }): Promise<void> {
    const list = this.getWhatsAppNumbers();
    const cleanPhone = payload.phone_number.replace(/\D/g, '');
    if (payload.id) {
      const updated = list.map((w) =>
        w.id === payload.id
          ? {
              ...w,
              label: payload.label.trim(),
              phone_number: cleanPhone,
              department: payload.department.trim(),
              default_greeting: payload.default_greeting.trim(),
            }
          : w
      );
      saveToStorage(STORAGE_KEYS.WA_NUMBERS, updated);
    } else {
      const newItem: WhatsAppNumberItem = {
        id: Math.max(0, ...list.map((w) => w.id)) + 1,
        label: payload.label.trim(),
        phone_number: cleanPhone,
        department: payload.department.trim() || 'Admisión',
        default_greeting: payload.default_greeting.trim(),
      };
      saveToStorage(STORAGE_KEYS.WA_NUMBERS, [...list, newItem]);
    }
    this.notify();

    try {
      await fetchWithTimeout('/api/whatsapp-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payload.id,
          label: payload.label.trim(),
          phone_number: cleanPhone,
          department: payload.department.trim() || 'Admisión',
          default_greeting: payload.default_greeting.trim(),
        }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async deleteWhatsAppNumber(id: number): Promise<void> {
    const list = this.getWhatsAppNumbers().filter((w) => w.id !== id);
    saveToStorage(STORAGE_KEYS.WA_NUMBERS, list);
    this.notify();

    try {
      await fetchWithTimeout('/api/whatsapp-numbers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }
  }

  static async purgeCounts(params: {
    startDate: string;
    endDate: string;
    mode: 'purgeable_only' | 'specific_target';
    targetId?: string;
    removeEmptyLinks?: boolean;
  }): Promise<{ purged_events: number; message: string }> {
    const isTestPattern = (s: string) => /prueba|test|demo|simulaci/i.test(s);
    let purgedCount = 0;

    const records = this.getRecords();
    const updatedRecords: SubcampaignRecord[] = [];

    for (const r of records) {
      const inRange =
        r.last_activity_date >= params.startDate &&
        r.last_activity_date <= params.endDate;
      const matchesTarget =
        params.mode === 'specific_target'
          ? r.id === params.targetId
          : Boolean(r.is_purgeable) || isTestPattern(r.subcampaign);

      if (inRange && matchesTarget) {
        purgedCount += r.clicks;
        if (!params.removeEmptyLinks) {
          updatedRecords.push({ ...r, clicks: 0, unique_visitors: 0 });
        }
      } else {
        updatedRecords.push(r);
      }
    }
    saveToStorage(STORAGE_KEYS.RECORDS, updatedRecords);

    if (params.removeEmptyLinks) {
      const filteredLinks = this.getLinks().filter((l) => {
        if (l.is_master_route) return true;
        const key = `${l.channel}::${l.period}::${l.campaign}::${l.career}::${l.subcampaign}`;
        if (params.mode === 'specific_target' && key === params.targetId) {
          return false;
        }
        if (
          params.mode === 'purgeable_only' &&
          (l.is_purgeable || isTestPattern(l.subcampaign))
        ) {
          return false;
        }
        return true;
      });
      saveToStorage(STORAGE_KEYS.LINKS, filteredLinks);
    }
    this.notify();

    try {
      const res = await fetchWithTimeout('/api/purge-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: params.startDate,
          end_date: params.endDate,
          mode: params.mode,
          target_id: params.targetId,
          remove_empty_links: params.removeEmptyLinks,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await this.syncFromServer();
        return {
          purged_events: data.purged_events ?? purgedCount,
          message:
            data.message ||
            `Se depuraron los conteos de prueba (${params.startDate} al ${params.endDate}).`,
        };
      }
    } catch {
      // ignore offline
    }

    return {
      purged_events: purgedCount,
      message: `Se depuraron ${purgedCount} clics de prueba (${params.startDate} al ${params.endDate}).`,
    };
  }

  /**
   * Simulador: solo permite añadir conteo a los enlaces ya generados (links).
   */
  static async simulateTestClick(params: {
    linkId: number;
    isBot: boolean;
  }): Promise<{ counted: boolean; message: string }> {
    if (params.isBot) {
      return {
        counted: false,
        message: 'Bot bloqueado por el filtro. No alteró el conteo.',
      };
    }

    const links = this.getLinks();
    const targetLink = links.find((l) => l.id === params.linkId);
    if (!targetLink) {
      return { counted: false, message: 'Selecciona un enlace generado válido.' };
    }

    const today = new Date().toISOString().slice(0, 10);
    const updatedLinks = links.map((l) =>
      l.id === targetLink.id
        ? {
            ...l,
            total_clicks: l.total_clicks + 1,
            unique_visitors: l.unique_visitors + 1,
          }
        : l
    );
    saveToStorage(STORAGE_KEYS.LINKS, updatedLinks);

    const recKey = `${targetLink.channel}::${targetLink.period}::${targetLink.campaign}::${targetLink.career}::${targetLink.subcampaign}`;
    const records = this.getRecords();
    const idx = records.findIndex((r) => r.id === recKey);
    if (idx !== -1) {
      records[idx].clicks += 1;
      records[idx].unique_visitors += 1;
      records[idx].last_activity_date = today;
      records[idx].is_purgeable = true;
      saveToStorage(STORAGE_KEYS.RECORDS, records);
    } else {
      const newRec: SubcampaignRecord = {
        id: recKey,
        channel: targetLink.channel,
        period: targetLink.period,
        campaign: targetLink.campaign,
        career: targetLink.career,
        subcampaign: targetLink.subcampaign,
        advisor_name: targetLink.advisor_name,
        whatsapp_phone: targetLink.whatsapp_phone,
        short_link: `trace.icontinental.edu.pe/${targetLink.short_code}`,
        clicks: 1,
        unique_visitors: 1,
        last_activity_date: today,
        is_purgeable: true,
      };
      saveToStorage(STORAGE_KEYS.RECORDS, [newRec, ...records]);
    }
    this.notify();

    try {
      await fetchWithTimeout('/api/simulate-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_bot: false,
          link_id: targetLink.id,
          channel: targetLink.channel,
          period: targetLink.period,
          campaign: targetLink.campaign,
          career: targetLink.career,
          subcampaign: targetLink.subcampaign,
          advisor_name: targetLink.advisor_name,
          whatsapp_phone: targetLink.whatsapp_phone,
          short_link: `trace.icontinental.edu.pe/${targetLink.short_code}`,
        }),
      });
      await this.syncFromServer();
    } catch {
      // ignore offline
    }

    return {
      counted: true,
      message: `+1 clic de prueba sumado al enlace ${targetLink.short_code} (${targetLink.subcampaign} — ${targetLink.career}).`,
    };
  }
}
