export type ChannelKey =
  | 'web_institucional'
  | 'link_ads'
  | 'mailing_sms_chattigo'
  | 'asesor_prospector';

export interface PeriodItem {
  id: number;
  code: string;        // Ej: "202610", "202620", "202710"
  is_active: boolean;  // Periodo global activo para todos los enlaces
  usage_count: number; // Enlaces + clics asociados (si > 0 no se puede eliminar)
}

export interface CareerItem {
  id: number;
  name: string;        // Ej: "Diseño de Modas", "Contabilidad", "Gastronomía"
}

export interface SubchannelItem {
  id: number;
  channel: ChannelKey; // Canal padre al que pertenece
  name: string;        // Ej: "portal-web", "landing-page", "tiktok-ads", "mail", "sms", "whatsapp"
}

export interface AdvisorItem {
  id: number;
  name: string;         // Ej: "Gerber"
  phone_number: string; // Ej: "51987654321"
}

export interface WhatsAppNumberItem {
  id: number;
  label: string;
  phone_number: string;
  department: string;
  default_greeting: string;
}

export interface LinkItem {
  id: number;
  slug: string;
  short_code: string;  // Ej: "ic-7k9x2m"
  short_url: string;   // Ej: "https://trace.icontinental.edu.pe/ic-7k9x2m"
  normal_url: string;
  title: string;
  channel: ChannelKey;
  period: string;      // Ej: "202710" (tomado del Periodo Global Activo)
  campaign: string;    // Ej: "PRESENCIAL", "SEMIPRESENCIAL", "A_DISTANCIA", "EVENTOS"
  career: string;      // Ej: "Diseño de Modas", "Contabilidad"
  subcampaign: string; // Subcanal (ej: "portal-web", "tiktok-ads", "whatsapp") o Asesor ("Gerber")
  advisor_name?: string | null;
  destination_type: 'whatsapp' | 'url';
  destination_url: string | null;
  whatsapp_phone: string;
  whatsapp_message: string;
  is_master_route?: boolean;
  is_purgeable?: boolean;
  total_clicks: number;
  unique_visitors: number;
  created_at: string;
}

export interface SubcampaignRecord {
  id: string;
  channel: ChannelKey;
  period: string;         // Ej: "202710"
  campaign: string;       // Ej: "PRESENCIAL", "SEMIPRESENCIAL", "A_DISTANCIA", "EVENTOS"
  career: string;         // Ej: "Diseño de Modas"
  subcampaign: string;    // Subcanal ("portal-web", "tiktok-ads", "whatsapp") o Asesor ("Gerber")
  advisor_name?: string | null;
  whatsapp_phone: string; // Ej: "51987654321"
  short_link: string;
  clicks: number;
  unique_visitors: number;
  last_activity_date: string; // YYYY-MM-DD
  is_purgeable?: boolean;
}

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  web_institucional: 'Orgánico',
  link_ads: 'Pauta',
  mailing_sms_chattigo: 'Nurturing (mixto)',
  asesor_prospector: 'Asesor / Prospector',
};

export const CHANNEL_BASE_SLUGS: Record<ChannelKey, string> = {
  web_institucional: 'organico',
  link_ads: 'pauta',
  mailing_sms_chattigo: 'nurturing',
  asesor_prospector: 'asesor',
};

/**
 * Genera un código corto determinista estilo Bitly (ej: "ic-8f4k2m")
 */
export function generateDeterministicShortCode(seed: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  let val = Math.abs(h1 >>> 0);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[val % alphabet.length];
    val = Math.floor(val / alphabet.length) ^ ((h1 >>> (i * 4)) & 0xff);
  }
  return `ic-${code}`;
}

/**
 * Normaliza en vivo la caja de texto de Campaña:
 * - Solo MAYÚSCULAS
 * - Sin tildes ni caracteres especiales
 * - Espacio se convierte en guion bajo (_)
 * - Máximo 30 caracteres
 */
export function sanitizeCampaignInput(raw: string): string {
  const noAccents = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const upper = noAccents.toUpperCase();
  const spaceToUnderscore = upper.replace(/\s+/g, '_');
  const validChars = spaceToUnderscore.replace(/[^A-Z0-9_]/g, '');
  const singleUnderscore = validChars.replace(/_+/g, '_');
  return singleUnderscore.slice(0, 30);
}

/**
 * Valida si un código de Periodo cumple el formato Año + (10 | 20 | 30), ej: 202610, 202720
 */
export function isValidPeriodCode(code: string): boolean {
  return /^20[2-3]\d(10|20|30)$/.test(code.trim());
}

/**
 * Construye el código de atención:
 * CODIGO = CAMPAÑA + PERIODO (ej: PRESENCIAL_202710)
 */
export function buildAttentionCode(params: {
  channel?: ChannelKey;
  subchannel?: string;
  campaign?: string;
  career?: string;
  period: string;
}): string {
  const cleanPer = params.period?.trim() || '[PERIODO]';
  const cleanCamp = sanitizeCampaignInput(params.campaign || '') || '[CAMPAÑA]';
  return `${cleanCamp}_${cleanPer}`;
}

/**
 * Construye el texto pre-escrito de WhatsApp:
 * "Hola, vengo de [SUBCANAL], quisiera más información sobre [CARRERA], en el Instituto y Escuela Superior Continental. Mi código de atención es [CAMPAÑA + PERIODO]"
 */
export function buildDefaultWhatsAppMessage(params: {
  channel: ChannelKey;
  campaign: string;
  career: string;
  period: string;
  subchannel?: string;
  advisorName?: string;
}): string {
  const cleanCareer = params.career?.trim() || '[CARRERA]';
  const sub =
    params.channel === 'asesor_prospector'
      ? params.advisorName?.trim() || params.subchannel?.trim() || '[SUBCANAL]'
      : params.subchannel?.trim() || '[SUBCANAL]';

  const code = buildAttentionCode({
    channel: params.channel,
    subchannel: sub,
    campaign: params.campaign,
    career: params.career,
    period: params.period,
  });

  if (params.channel === 'asesor_prospector') {
    return `Hola, soy ${sub}, quisiera más información sobre ${cleanCareer}, en el Instituto y Escuela Superior Continental. Mi código de atención es ${code}`;
  }

  return `Hola, vengo de ${sub}, quisiera más información sobre ${cleanCareer}, en el Instituto y Escuela Superior Continental. Mi código de atención es ${code}`;
}
