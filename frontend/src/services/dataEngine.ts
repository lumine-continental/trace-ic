import {
  CHANNEL_BASE_SLUGS,
  ChannelKey,
  LinkItem,
  SubcampaignRecord,
  WhatsAppNumberItem,
} from '../types/trace';

const STORAGE_KEYS = {
  LINKS: 'trace_ic_v4_links',
  RECORDS: 'trace_ic_v4_records',
  WA_NUMBERS: 'trace_ic_v4_wa',
};

const INITIAL_WA_NUMBERS: WhatsAppNumberItem[] = [
  {
    id: 1,
    label: 'WhatsApp Admisión Pregrado (Chattigo)',
    phone_number: '51987654321',
    department: 'Admisión Pregrado',
    default_greeting: 'Hola Instituto Continental, deseo recibir información sobre admisión.',
  },
  {
    id: 2,
    label: 'WhatsApp Educación Continua',
    phone_number: '51987654322',
    department: 'Educación Continua',
    default_greeting: 'Hola Instituto Continental, quisiera información sobre programas y cursos.',
  },
  {
    id: 3,
    label: 'WhatsApp Atención Becas y Convenios',
    phone_number: '51987654323',
    department: 'Becas',
    default_greeting: 'Hola Instituto Continental, deseo información sobre becas.',
  },
];

const INITIAL_LINKS: LinkItem[] = [
  {
    id: 1,
    slug: 'whatsapp-web',
    normal_url: 'https://trace.icontinental.edu.pe/whatsapp-web?campana=202710',
    has_custom_alias: true,
    title: 'Botón WhatsApp Global — Sitio Web Institucional',
    channel: 'web_institucional',
    campaign: '202710',
    subcampaign: 'Autodetectado por Carrera (/carrera/...)',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message: 'Hola Instituto Continental, estoy visitando su sitio web y deseo información.',
    is_master_route: true,
    total_clicks: 2516,
    unique_visitors: 2167,
    created_at: '2026-10-15',
  },
  {
    id: 2,
    slug: 'CRM',
    normal_url: 'https://trace.icontinental.edu.pe/CRM?campana=202710&subcampana=envio-general',
    has_custom_alias: true,
    title: 'Enlace Maestro Mailing / SMS / Chattigo (/CRM)',
    channel: 'mailing_sms_chattigo',
    campaign: '202710',
    subcampaign: 'Personalizable por campaña y subcampaña',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message: 'Hola Instituto Continental, recibí su comunicación y deseo más información.',
    is_master_route: true,
    total_clicks: 1145,
    unique_visitors: 998,
    created_at: '2026-10-18',
  },
  {
    id: 3,
    slug: 'tt-modas-202710',
    normal_url: 'https://trace.icontinental.edu.pe/tiktok?campana=202710&subcampana=conjunto-01-diseno-de-modas',
    has_custom_alias: true,
    title: 'TikTok Ads — Diseño de Modas',
    channel: 'tiktok_ads',
    campaign: '202710',
    subcampaign: 'Conjunto 01: Diseño de Modas (17-23 años)',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message: 'Hola Instituto Continental, vi su anuncio en TikTok sobre Diseño de Modas y quiero información.',
    total_clicks: 685,
    unique_visitors: 604,
    created_at: '2026-11-01',
  },
  {
    id: 4,
    slug: 'tt-sistemas-202710',
    normal_url: 'https://trace.icontinental.edu.pe/tiktok?campana=202710&subcampana=conjunto-02-tecnologia-sistemas',
    has_custom_alias: true,
    title: 'TikTok Ads — Desarrollo de Sistemas',
    channel: 'tiktok_ads',
    campaign: '202710',
    subcampaign: 'Conjunto 02: Tecnología y Programación',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message: 'Hola Instituto Continental, vi su video en TikTok de Desarrollo de Sistemas y quiero información.',
    total_clicks: 520,
    unique_visitors: 465,
    created_at: '2026-11-03',
  },
  {
    id: 5,
    slug: 'CRM?campana=202710&subcampana=sms-cierre-inscripcion',
    normal_url: 'https://trace.icontinental.edu.pe/CRM?campana=202710&subcampana=sms-cierre-inscripcion',
    has_custom_alias: false,
    title: 'SMS Recordatorio Cierre de Inscripción (Sin alias corto)',
    channel: 'mailing_sms_chattigo',
    campaign: '202710',
    subcampaign: 'SMS Recordatorio Cierre de Inscripción',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message: 'Hola Instituto Continental, recibí el SMS de cierre de inscripción y deseo matricularme.',
    total_clicks: 420,
    unique_visitors: 378,
    created_at: '2026-11-08',
  },
  {
    id: 6,
    slug: 'lp-admision',
    normal_url: 'https://trace.icontinental.edu.pe/landing?campana=202710&subcampana=boton-principal-hero',
    has_custom_alias: true,
    title: 'Landing Admisión — Botón Principal WhatsApp',
    channel: 'landing_page',
    campaign: '202710',
    subcampaign: 'Botón Principal Hero',
    destination_type: 'whatsapp',
    destination_url: null,
    whatsapp_phone: '51987654321',
    whatsapp_message: 'Hola Instituto Continental, vengo de la Landing de Admisión y deseo inscribirme.',
    total_clicks: 530,
    unique_visitors: 472,
    created_at: '2026-11-10',
  },
];

const INITIAL_RECORDS: SubcampaignRecord[] = [
  // 1. SITIO WEB INSTITUCIONAL (Campaña 202710 y 202720 -> Subcampaña = Carrera detectada)
  {
    id: 'web-1',
    channel: 'web_institucional',
    campaign: '202710',
    subcampaign: 'Diseño de Modas',
    url_reference: 'https://icontinental.edu.pe/carrera/diseno-de-modas/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 418,
    unique_visitors: 365,
    last_activity_date: '2026-11-11',
  },
  {
    id: 'web-2',
    channel: 'web_institucional',
    campaign: '202710',
    subcampaign: 'Contabilidad',
    url_reference: 'https://icontinental.edu.pe/carrera/contabilidad/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 384,
    unique_visitors: 332,
    last_activity_date: '2026-11-11',
  },
  {
    id: 'web-3',
    channel: 'web_institucional',
    campaign: '202710',
    subcampaign: 'Enfermería Técnica',
    url_reference: 'https://icontinental.edu.pe/carrera/enfermeria-tecnica/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 356,
    unique_visitors: 310,
    last_activity_date: '2026-11-10',
  },
  {
    id: 'web-4',
    channel: 'web_institucional',
    campaign: '202710',
    subcampaign: 'Desarrollo de Sistemas de Información',
    url_reference: 'https://icontinental.edu.pe/carrera/desarrollo-de-sistemas/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 298,
    unique_visitors: 254,
    last_activity_date: '2026-11-09',
  },
  {
    id: 'web-5',
    channel: 'web_institucional',
    campaign: '202710',
    subcampaign: 'Administración de Empresas',
    url_reference: 'https://icontinental.edu.pe/carrera/administracion-de-empresas/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 245,
    unique_visitors: 212,
    last_activity_date: '2026-11-06',
  },
  {
    id: 'web-6',
    channel: 'web_institucional',
    campaign: '202710',
    subcampaign: 'Diseño Gráfico Publicitario',
    url_reference: 'https://icontinental.edu.pe/carrera/diseno-grafico/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 210,
    unique_visitors: 184,
    last_activity_date: '2026-10-28',
  },
  {
    id: 'web-7',
    channel: 'web_institucional',
    campaign: '202710',
    subcampaign: 'Gastronomía',
    url_reference: 'https://icontinental.edu.pe/carrera/gastronomia/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 189,
    unique_visitors: 162,
    last_activity_date: '2026-10-22',
  },
  {
    id: 'web-8',
    channel: 'web_institucional',
    campaign: '202720',
    subcampaign: 'Página de Admisión General',
    url_reference: 'https://icontinental.edu.pe/admision/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 274,
    unique_visitors: 230,
    last_activity_date: '2026-11-11',
  },
  {
    id: 'web-9',
    channel: 'web_institucional',
    campaign: '202720',
    subcampaign: 'Página de Becas y Créditos',
    url_reference: 'https://icontinental.edu.pe/becas/',
    short_link: 'trace.icontinental.edu.pe/whatsapp-web',
    clicks: 142,
    unique_visitors: 118,
    last_activity_date: '2026-10-18',
  },

  // 2. TIKTOK ADS (Campaña 202710 / 202720 -> Subcampaña = Conjunto de Anuncios)
  {
    id: 'tt-1',
    channel: 'tiktok_ads',
    campaign: '202710',
    subcampaign: 'Conjunto 01: Diseño de Modas (17-23 años)',
    short_link: 'trace.icontinental.edu.pe/tt-modas-202710',
    clicks: 685,
    unique_visitors: 604,
    last_activity_date: '2026-11-11',
  },
  {
    id: 'tt-2',
    channel: 'tiktok_ads',
    campaign: '202710',
    subcampaign: 'Conjunto 02: Tecnología y Programación',
    short_link: 'trace.icontinental.edu.pe/tt-sistemas-202710',
    clicks: 520,
    unique_visitors: 465,
    last_activity_date: '2026-11-10',
  },
  {
    id: 'tt-3',
    channel: 'tiktok_ads',
    campaign: '202710',
    subcampaign: 'Conjunto 03: Vocación Salud Junín',
    short_link: 'trace.icontinental.edu.pe/tt-enfermeria-202710',
    clicks: 490,
    unique_visitors: 430,
    last_activity_date: '2026-11-07',
  },
  {
    id: 'tt-4',
    channel: 'tiktok_ads',
    campaign: '202720',
    subcampaign: 'Conjunto 01: Adelanto Admisión 2027-II',
    short_link: 'trace.icontinental.edu.pe/tt-adelanto-202720',
    clicks: 310,
    unique_visitors: 275,
    last_activity_date: '2026-10-25',
  },

  // 3. MAILING / SMS / CHATTIGO (/CRM)
  {
    id: 'crm-1',
    channel: 'mailing_sms_chattigo',
    campaign: '202710',
    subcampaign: 'SMS Recordatorio Cierre de Inscripción',
    short_link: 'trace.icontinental.edu.pe/CRM?campana=202710&subcampana=sms-cierre-inscripcion',
    clicks: 420,
    unique_visitors: 378,
    last_activity_date: '2026-11-11',
  },
  {
    id: 'crm-2',
    channel: 'mailing_sms_chattigo',
    campaign: '202710',
    subcampaign: 'Chattigo Envío Masivo Horarios de Inicio',
    short_link: 'trace.icontinental.edu.pe/CRM?campana=202710&subcampana=chattigo-horarios',
    clicks: 392,
    unique_visitors: 350,
    last_activity_date: '2026-11-09',
  },
  {
    id: 'crm-3',
    channel: 'mailing_sms_chattigo',
    campaign: '202710',
    subcampaign: 'Mailing Bienvenida y Guía de Carreras',
    short_link: 'trace.icontinental.edu.pe/CRM?campana=202710&subcampana=mailing-bienvenida',
    clicks: 195,
    unique_visitors: 160,
    last_activity_date: '2026-10-29',
  },
  {
    id: 'crm-4',
    channel: 'mailing_sms_chattigo',
    campaign: '202720',
    subcampaign: 'SMS Beneficio Pronto Pago',
    short_link: 'trace.icontinental.edu.pe/CRM?campana=202720&subcampana=sms-pronto-pago',
    clicks: 138,
    unique_visitors: 110,
    last_activity_date: '2026-10-19',
  },

  // 4. LANDING PAGES
  {
    id: 'lp-1',
    channel: 'landing_page',
    campaign: '202710',
    subcampaign: 'Botón Principal Hero',
    short_link: 'trace.icontinental.edu.pe/lp-admision',
    clicks: 530,
    unique_visitors: 472,
    last_activity_date: '2026-11-11',
  },
  {
    id: 'lp-2',
    channel: 'landing_page',
    campaign: '202710',
    subcampaign: 'Botón Consulta de Costos y Pensiones',
    short_link: 'trace.icontinental.edu.pe/lp-costos',
    clicks: 215,
    unique_visitors: 188,
    last_activity_date: '2026-11-04',
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

export function buildNormalTrackingUrl(params: {
  channel: ChannelKey;
  campaign: string;
  subcampaign: string;
}): string {
  const baseSlug = CHANNEL_BASE_SLUGS[params.channel];
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'general';

  const c = encodeURIComponent(params.campaign || '202710');
  const sub = slugify(params.subcampaign || 'general');
  return `https://trace.icontinental.edu.pe/${baseSlug}?campana=${c}&subcampana=${sub}`;
}

export class DataEngine {
  private static onSyncCallback: (() => void) | null = null;

  static setOnSync(cb: () => void): void {
    this.onSyncCallback = cb;
  }

  static async syncFromServer(): Promise<boolean> {
    try {
      const res = await fetch('/api/state', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (Array.isArray(data.links)) {
        saveToStorage(STORAGE_KEYS.LINKS, data.links);
      }
      if (Array.isArray(data.records)) {
        saveToStorage(STORAGE_KEYS.RECORDS, data.records);
      }
      if (Array.isArray(data.whatsapp_numbers)) {
        saveToStorage(STORAGE_KEYS.WA_NUMBERS, data.whatsapp_numbers);
      }
      if (this.onSyncCallback) {
        this.onSyncCallback();
      }
      return true;
    } catch {
      return false;
    }
  }

  static getLinks(): LinkItem[] {
    return loadFromStorage<LinkItem[]>(STORAGE_KEYS.LINKS, INITIAL_LINKS);
  }

  static getRecords(): SubcampaignRecord[] {
    return loadFromStorage<SubcampaignRecord[]>(STORAGE_KEYS.RECORDS, INITIAL_RECORDS);
  }

  static getWhatsAppNumbers(): WhatsAppNumberItem[] {
    return loadFromStorage<WhatsAppNumberItem[]>(STORAGE_KEYS.WA_NUMBERS, INITIAL_WA_NUMBERS);
  }

  static createLink(payload: {
    title: string;
    useShortAlias: boolean;
    customSlug?: string;
    channel: ChannelKey;
    campaign: string;
    subcampaign: string;
    destination_type: 'whatsapp' | 'url';
    destination_url?: string;
    whatsapp_phone?: string;
    whatsapp_message?: string;
  }): LinkItem {
    const links = this.getLinks();
    const records = this.getRecords();

    const normalUrl = buildNormalTrackingUrl({
      channel: payload.channel,
      campaign: payload.campaign,
      subcampaign: payload.subcampaign,
    });

    let finalSlug = '';
    if (payload.useShortAlias) {
      finalSlug = (payload.customSlug || `ic-${Math.random().toString(36).substring(2, 6)}`)
        .trim()
        .replace(/[^a-zA-Z0-9\-_]/g, '-');

      if (links.some((l) => l.slug.toLowerCase() === finalSlug.toLowerCase())) {
        throw new Error(`Ya existe un alias corto llamado /${finalSlug}`);
      }
    } else {
      // Usa directamente la ruta del enlace normal sin crear alias corto
      finalSlug = normalUrl.replace('https://trace.icontinental.edu.pe/', '');
    }

    const today = new Date().toISOString().slice(0, 10);
    const newLink: LinkItem = {
      id: Math.max(0, ...links.map((l) => l.id)) + 1,
      slug: finalSlug,
      normal_url: normalUrl,
      has_custom_alias: payload.useShortAlias,
      title: payload.title.trim(),
      channel: payload.channel,
      campaign: payload.campaign,
      subcampaign: payload.subcampaign.trim() || 'General',
      destination_type: payload.destination_type,
      destination_url: payload.destination_type === 'url' ? payload.destination_url || null : null,
      whatsapp_phone:
        payload.destination_type === 'whatsapp' ? payload.whatsapp_phone || '51987654321' : null,
      whatsapp_message:
        payload.destination_type === 'whatsapp'
          ? payload.whatsapp_message || 'Hola Instituto Continental, deseo recibir información.'
          : null,
      total_clicks: 0,
      unique_visitors: 0,
      created_at: today,
    };

    const newRecord: SubcampaignRecord = {
      id: `${newLink.channel}::${newLink.campaign}::${newLink.subcampaign}`,
      channel: newLink.channel,
      campaign: newLink.campaign,
      subcampaign: newLink.subcampaign,
      short_link: `trace.icontinental.edu.pe/${newLink.slug}`,
      clicks: 0,
      unique_visitors: 0,
      last_activity_date: today,
    };

    saveToStorage(STORAGE_KEYS.LINKS, [newLink, ...links]);
    saveToStorage(STORAGE_KEYS.RECORDS, [newRecord, ...records]);

    fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLink),
    })
      .then(() => this.syncFromServer())
      .catch(() => {});

    return newLink;
  }

  static deleteLink(id: number): void {
    const links = this.getLinks().filter((l) => l.id !== id);
    saveToStorage(STORAGE_KEYS.LINKS, links);

    fetch(`/api/links/${id}`, { method: 'DELETE' })
      .then(() => this.syncFromServer())
      .catch(() => {});
  }

  static saveWhatsAppNumber(payload: {
    id?: number;
    label: string;
    phone_number: string;
    department: string;
    default_greeting: string;
  }): void {
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
        default_greeting:
          payload.default_greeting.trim() ||
          'Hola Instituto Continental, deseo recibir información.',
      };
      saveToStorage(STORAGE_KEYS.WA_NUMBERS, [...list, newItem]);
    }

    fetch('/api/whatsapp-numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: payload.id,
        label: payload.label.trim(),
        phone_number: cleanPhone,
        department: payload.department.trim() || 'Admisión',
        default_greeting:
          payload.default_greeting.trim() ||
          'Hola Instituto Continental, deseo recibir información.',
      }),
    })
      .then(() => this.syncFromServer())
      .catch(() => {});
  }

  static deleteWhatsAppNumber(id: number): void {
    const list = this.getWhatsAppNumbers().filter((w) => w.id !== id);
    saveToStorage(STORAGE_KEYS.WA_NUMBERS, list);

    fetch(`/api/whatsapp-numbers/${id}`, { method: 'DELETE' })
      .then(() => this.syncFromServer())
      .catch(() => {});
  }

  static simulateTestClick(params: {
    recordId: string;
    isBot: boolean;
  }): { counted: boolean; message: string } {
    if (params.isBot) {
      return {
        counted: false,
        message: 'Vista previa de Bot (WhatsApp/Redes) detectada y bloqueada. No alteró el conteo de clics.',
      };
    }
    const records = this.getRecords();
    const idx = records.findIndex((r) => r.id === params.recordId);
    if (idx !== -1) {
      const rec = records[idx];
      rec.clicks += 1;
      rec.unique_visitors += 1;
      rec.last_activity_date = new Date().toISOString().slice(0, 10);
      saveToStorage(STORAGE_KEYS.RECORDS, records);

      fetch('/api/simulate-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_bot: false,
          channel: rec.channel,
          campaign: rec.campaign,
          subcampaign: rec.subcampaign,
          url_reference: rec.url_reference,
          short_link: rec.short_link,
        }),
      })
        .then(() => this.syncFromServer())
        .catch(() => {});

      return {
        counted: true,
        message: `+1 clic real sumado en [${rec.campaign}] → ${rec.subcampaign}.`,
      };
    }
    return { counted: false, message: 'No se encontró el registro.' };
  }
}
