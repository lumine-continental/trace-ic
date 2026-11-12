export type ChannelKey =
  | 'web_institucional'
  | 'tiktok_ads'
  | 'mailing_sms_chattigo'
  | 'landing_page';

export const CAMPAIGN_ORIGINS = [
  '202710',
  '202720',
  '202730',
  '202810',
  '202820',
  '202830',
  '202910',
  '202920',
  '202930',
] as const;

export type CampaignOriginCode = (typeof CAMPAIGN_ORIGINS)[number];

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
  normal_url: string; // El resultado del enlace normal con parámetros antes de usar alias corto
  has_custom_alias: boolean;
  title: string;
  channel: ChannelKey;
  campaign: string;    // Ej: "202710", "202720"...
  subcampaign: string; // Ej: "Conjunto Diseño de Modas", "SMS Cierre", "Diseño de Modas"
  destination_type: 'whatsapp' | 'url';
  destination_url: string | null;
  whatsapp_phone: string | null;
  whatsapp_message: string | null;
  is_master_route?: boolean;
  is_purgeable?: boolean; // Si el enlace permite depurar sus conteos (enlace de prueba)
  total_clicks: number;
  unique_visitors: number;
  created_at: string;
}

export interface SubcampaignRecord {
  id: string;
  channel: ChannelKey;
  campaign: string;    // Ej: "202710", "202720"
  subcampaign: string; // Ej: "Diseño de Modas", "Conjunto 01: Moda", "SMS Recordatorio"
  url_reference?: string;
  short_link: string;
  clicks: number;
  unique_visitors: number;
  last_activity_date: string; // YYYY-MM-DD para el filtro de calendario
  is_purgeable?: boolean; // Si esta subcampaña es depurable / de prueba
}

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  web_institucional: 'Sitio Web Institucional',
  tiktok_ads: 'TikTok Ads',
  mailing_sms_chattigo: 'Mailing / SMS / Chattigo (/CRM)',
  landing_page: 'Landing Pages',
};

export const CHANNEL_BASE_SLUGS: Record<ChannelKey, string> = {
  web_institucional: 'whatsapp-web',
  tiktok_ads: 'tiktok',
  mailing_sms_chattigo: 'CRM',
  landing_page: 'landing',
};
