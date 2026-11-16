export type ChannelKey =
  | 'web_institucional'
  | 'link_ads'
  | 'mailing_sms_chattigo'
  | 'asesor_prospector';

export interface PeriodItem {
  id: number;
  code: string;        // Ej: "202610", "202620", "202710" (Año + 10 | 20 | 30)
  is_active: boolean;  // Periodo global activo para nuevos enlaces
  usage_count: number; // Enlaces + clics asociados (si > 0 no se puede eliminar)
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
  normal_url: string;
  title: string;
  channel: ChannelKey;
  period: string;      // Ej: "202710"
  campaign: string;    // Ej: "NURTURING_CHATTIGO", "PORTALWEB", "GASTRONOMIA"
  subcampaign: string; // Ej: "tiktok-ads", "google-pmax", "Gerber", "Diseño de Modas"
  advisor_name?: string | null;
  destination_type: 'whatsapp' | 'url';
  destination_url: string | null;
  whatsapp_phone: string | null;
  whatsapp_message: string | null;
  is_master_route?: boolean;
  is_purgeable?: boolean;
  total_clicks: number;
  unique_visitors: number;
  created_at: string;
}

export interface SubcampaignRecord {
  id: string;
  channel: ChannelKey;
  period: string;      // Ej: "202710"
  campaign: string;    // Ej: "NURTURING_CHATTIGO", "GASTRONOMIA"
  subcampaign: string; // Ej: "tiktok-ads", "google-display", "Gerber", "Diseño de Modas"
  url_reference?: string;
  short_link: string;
  clicks: number;
  unique_visitors: number;
  last_activity_date: string; // YYYY-MM-DD
  is_purgeable?: boolean;
}

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  web_institucional: 'Portal Web Institucional',
  link_ads: 'Link Ads',
  mailing_sms_chattigo: 'Mailing / SMS / Chattigo (/CRM)',
  asesor_prospector: 'Asesor / Prospector',
};

export const CHANNEL_BASE_SLUGS: Record<ChannelKey, string> = {
  web_institucional: 'whatsapp-web',
  link_ads: 'link-ads',
  mailing_sms_chattigo: 'CRM',
  asesor_prospector: 'asesor',
};

export const LINK_ADS_PLATFORMS = [
  { value: 'tiktok-ads', label: 'TikTok Ads (tiktok-ads)' },
  { value: 'google-search', label: 'Google Search (google-search)' },
  { value: 'google-display', label: 'Google Display (google-display)' },
  { value: 'google-pmax', label: 'Google Performance Max (google-pmax)' },
  { value: 'google-youtube', label: 'Google YouTube (google-youtube)' },
  { value: 'linkedin-ads', label: 'LinkedIn Ads (linkedin-ads)' },
] as const;

export const CRM_ORIGINS = [
  { value: 'chattigo', label: 'Chattigo (WhatsApp Masivo)' },
  { value: 'sms', label: 'SMS Masivo' },
  { value: 'mailing', label: 'Mailing / Correo' },
] as const;

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
 * Construye el texto predeterminado de WhatsApp y su Código de Atención
 * según el escenario seleccionado.
 */
export function buildDefaultWhatsAppMessage(params: {
  channel: ChannelKey;
  campaign: string;
  period: string;
  utmSource?: string;
  advisorName?: string;
  detectedUrl?: string;
}): string {
  const cleanCamp = sanitizeCampaignInput(params.campaign) || 'GENERAL';
  const cleanPer = params.period || '202710';
  const baseCode = `${cleanCamp}_${cleanPer}`;

  if (params.channel === 'asesor_prospector') {
    const advisor = params.advisorName?.trim() || 'Asesor';
    return `Hola, ${advisor}, quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención ${baseCode}`;
  }

  if (params.channel === 'web_institucional') {
    const subsite = params.detectedUrl?.trim();
    if (subsite) {
      return `Hola, vengo de ${subsite} y quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención ${baseCode}`;
    }
    return `Hola, vengo del portal web y quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención ${baseCode}`;
  }

  const originRaw = (params.utmSource || 'digital').trim();
  const originCode = originRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fullCode = originCode ? `${baseCode}_${originCode}` : baseCode;
  return `Hola, vengo de ${originRaw} y quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención ${fullCode}`;
}
