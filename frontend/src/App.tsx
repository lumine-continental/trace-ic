import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Globe,
  Link2,
  LogOut,
  MessageSquare,
  Phone,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  CAMPAIGN_ORIGINS,
  CHANNEL_LABELS,
  ChannelKey,
  LinkItem,
  SubcampaignRecord,
  WhatsAppNumberItem,
} from './types/trace';
import { buildNormalTrackingUrl, DataEngine } from './services/dataEngine';
import { renderQrPngDataUrl, renderQrSvg } from './utils/qrGenerator';

type MainModule = 'reports' | 'generator' | 'tools';
type DatePreset =
  | 'today'
  | 'this_week'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_month'
  | 'custom'
  | 'all';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState('admin@icontinental.edu.pe');
  const [loginPassword, setLoginPassword] = useState('TraceIC2026!');

  const [activeModule, setActiveModule] = useState<MainModule>('reports');

  // Datos sincronizados
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [records, setRecords] = useState<SubcampaignRecord[]>([]);
  const [waNumbers, setWaNumbers] = useState<WhatsAppNumberItem[]>([]);

  // ===========================================================================
  // ESTADOS DE REPORTERÍA (Fechas con calendario + Filtro de Campaña Origen)
  // ===========================================================================
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('2025-01-01');
  const [endDate, setEndDate] = useState<string>('2029-12-31');
  const [reportCampaignFilter, setReportCampaignFilter] = useState<string>('all');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<ChannelKey | 'all'>('all');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ===========================================================================
  // ESTADOS DEL GENERADOR DE ENLACES
  // ===========================================================================
  const [genChannel, setGenChannel] = useState<ChannelKey>('mailing_sms_chattigo');
  const [genCampaign, setGenCampaign] = useState<string>('202710');
  const [genSubcampaign, setGenSubcampaign] = useState<string>('sms-cierre-inscripciones');
  const [genDestType, setGenDestType] = useState<'whatsapp' | 'url'>('whatsapp');
  const [genWaPhone, setGenWaPhone] = useState<string>('51987654321');
  const [genWaMessage, setGenWaMessage] = useState<string>(
    'Hola Instituto Continental, deseo recibir información sobre sus carreras.'
  );
  const [genDestUrl, setGenDestUrl] = useState<string>('https://icontinental.edu.pe/admision/');
  // Decisión de alias corto DESPUÉS de ver el enlace normal
  const [useShortAlias, setUseShortAlias] = useState<boolean>(false);
  const [customSlug, setCustomSlug] = useState<string>('');
  const [genTitle, setGenTitle] = useState<string>('');
  const [genFeedbackUrl, setGenFeedbackUrl] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState<string>('');

  // ===========================================================================
  // ESTADOS DEL MÓDULO 03: WHATSAPP Y HERRAMIENTAS ADICIONALES
  // ===========================================================================
  const [editingWaId, setEditingWaId] = useState<number | null>(null);
  const [waLabelInput, setWaLabelInput] = useState('');
  const [waPhoneInput, setWaPhoneInput] = useState('');
  const [waDeptInput, setWaDeptInput] = useState('Admisión');
  const [waGreetingInput, setWaGreetingInput] = useState(
    'Hola Instituto Continental, deseo recibir información.'
  );

  // Herramienta QR
  const [qrSelectedUrl, setQrSelectedUrl] = useState<string>(
    'https://trace.icontinental.edu.pe/whatsapp-web'
  );
  const [qrColor, setQrColor] = useState<'#111827' | '#E4000B'>('#111827');
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [qrSvgText, setQrSvgText] = useState<string>('');

  // Herramienta Simulador / Probador de Clics
  const [simRecordId, setSimRecordId] = useState<string>('web-1');
  const [simIsBot, setSimIsBot] = useState<boolean>(false);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  const refreshLocalState = () => {
    const loadedLinks = DataEngine.getLinks();
    const loadedRecords = DataEngine.getRecords();
    const loadedWa = DataEngine.getWhatsAppNumbers();
    setLinks(loadedLinks);
    setRecords(loadedRecords);
    setWaNumbers(loadedWa);

    if (loadedRecords.length > 0 && !loadedRecords.some((r) => r.id === simRecordId)) {
      setSimRecordId(loadedRecords[0].id);
    }

    const exp: Record<string, boolean> = {};
    loadedRecords.forEach((r) => {
      exp[`${r.channel}::${r.campaign}`] = true;
    });
    setExpandedCampaigns((prev) => ({ ...exp, ...prev }));
  };

  const loadData = () => {
    refreshLocalState();
    void DataEngine.syncFromServer();
  };

  useEffect(() => {
    DataEngine.setOnSync(() => {
      refreshLocalState();
    });
    loadData();
  }, []);

  useEffect(() => {
    const target = qrSelectedUrl || 'https://trace.icontinental.edu.pe/whatsapp-web';
    setQrPngUrl(renderQrPngDataUrl(target, qrColor, 600, 2));
    setQrSvgText(renderQrSvg(target, qrColor, 2));
  }, [qrSelectedUrl, qrColor]);

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const todayStr = fmt(now);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_week') {
      const start = new Date(now);
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - (day - 1));
      setStartDate(fmt(start));
      setEndDate(todayStr);
    } else if (preset === 'last_7_days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      setStartDate(fmt(start));
      setEndDate(todayStr);
    } else if (preset === 'last_30_days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      setStartDate(fmt(start));
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(fmt(firstPrev));
      setEndDate(fmt(lastPrev));
    } else if (preset === 'all') {
      setStartDate('2025-01-01');
      setEndDate('2029-12-31');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Vista previa en tiempo real del Enlace Normal (antes de decidir si se usa alias corto)
  const previewNormalUrl = useMemo(() => {
    return buildNormalTrackingUrl({
      channel: genChannel,
      campaign: genCampaign,
      subcampaign: genSubcampaign,
    });
  }, [genChannel, genCampaign, genSubcampaign]);

  const previewShortAliasUrl = useMemo(() => {
    const clean = customSlug.trim().replace(/[^a-zA-Z0-9\-_]/g, '-') || 'mi-alias';
    return `https://trace.icontinental.edu.pe/${clean}`;
  }, [customSlug]);

  // Filtrar registros según el rango de fechas del calendario y la Campaña (Origen)
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchDate =
        r.last_activity_date >= startDate && r.last_activity_date <= endDate;
      const matchCampaign =
        reportCampaignFilter === 'all' || r.campaign === reportCampaignFilter;
      return matchDate && matchCampaign;
    });
  }, [records, startDate, endDate, reportCampaignFilter]);

  const channelTotals = useMemo(() => {
    const map: Record<ChannelKey, { clicks: number; unique: number }> = {
      web_institucional: { clicks: 0, unique: 0 },
      tiktok_ads: { clicks: 0, unique: 0 },
      mailing_sms_chattigo: { clicks: 0, unique: 0 },
      landing_page: { clicks: 0, unique: 0 },
    };
    filteredRecords.forEach((r) => {
      if (map[r.channel]) {
        map[r.channel].clicks += r.clicks;
        map[r.channel].unique += r.unique_visitors;
      }
    });
    const grandTotalClicks = Object.values(map).reduce((acc, v) => acc + v.clicks, 0);
    const grandTotalUnique = Object.values(map).reduce((acc, v) => acc + v.unique, 0);
    return { byChannel: map, grandTotalClicks, grandTotalUnique };
  }, [filteredRecords]);

  const hierarchicalReport = useMemo(() => {
    const channelsOrder: ChannelKey[] = [
      'web_institucional',
      'tiktok_ads',
      'mailing_sms_chattigo',
      'landing_page',
    ];

    return channelsOrder
      .filter((ch) => selectedChannelFilter === 'all' || ch === selectedChannelFilter)
      .map((ch) => {
        const chRecords = filteredRecords.filter((r) => r.channel === ch);
        const campaignsMap = new Map<
          string,
          {
            campaign: string;
            clicks: number;
            unique: number;
            subcampaigns: SubcampaignRecord[];
          }
        >();

        chRecords.forEach((rec) => {
          const current = campaignsMap.get(rec.campaign) || {
            campaign: rec.campaign,
            clicks: 0,
            unique: 0,
            subcampaigns: [],
          };
          current.clicks += rec.clicks;
          current.unique += rec.unique_visitors;
          current.subcampaigns.push(rec);
          campaignsMap.set(rec.campaign, current);
        });

        const campaignsList = Array.from(campaignsMap.values()).map((c) => ({
          ...c,
          subcampaigns: c.subcampaigns.sort((a, b) => b.clicks - a.clicks),
        }));

        const totalClicks = campaignsList.reduce((s, c) => s + c.clicks, 0);
        const totalUnique = campaignsList.reduce((s, c) => s + c.unique, 0);

        return {
          channel: ch,
          channelLabel: CHANNEL_LABELS[ch],
          totalClicks,
          totalUnique,
          campaigns: campaignsList.sort((a, b) => b.clicks - a.clicks),
        };
      });
  }, [filteredRecords, selectedChannelFilter]);

  const websiteCareersRanking = useMemo(() => {
    return filteredRecords
      .filter(
        (r) =>
          r.channel === 'web_institucional' &&
          r.url_reference?.includes('/carrera/')
      )
      .sort((a, b) => b.clicks - a.clicks);
  }, [filteredRecords]);

  const handleExportReportCsv = () => {
    const headers = [
      'Canal',
      'Campana_Origen',
      'Subcampana_o_Conjunto_o_Carrera',
      'Enlace_o_URL_Origen',
      'Clics_Totales',
      'Personas_Unicas',
      'Fecha_Actividad',
    ];
    const rows = filteredRecords.map((r) => [
      `"${CHANNEL_LABELS[r.channel]}"`,
      `"${r.campaign}"`,
      `"${r.subcampaign.replace(/"/g, '""')}"`,
      `"${r.url_reference || `https://${r.short_link}`}"`,
      r.clicks,
      r.unique_visitors,
      r.last_activity_date,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_TraceIC_${startDate}_al_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    setGenFeedbackUrl(null);

    const autoTitle =
      genTitle.trim() ||
      `${CHANNEL_LABELS[genChannel]} — ${genCampaign} (${genSubcampaign || 'General'})`;

    try {
      const created = DataEngine.createLink({
        title: autoTitle,
        useShortAlias,
        customSlug: useShortAlias ? customSlug.trim() : undefined,
        channel: genChannel,
        campaign: genCampaign,
        subcampaign: genSubcampaign.trim() || 'General',
        destination_type: genDestType,
        destination_url: genDestType === 'url' ? genDestUrl.trim() : undefined,
        whatsapp_phone: genDestType === 'whatsapp' ? genWaPhone : undefined,
        whatsapp_message: genDestType === 'whatsapp' ? genWaMessage.trim() : undefined,
      });

      const finalUrl = `https://trace.icontinental.edu.pe/${created.slug}`;
      setGenFeedbackUrl(finalUrl);
      setGenTitle('');
      setCustomSlug('');
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar el enlace');
    }
  };

  const handleSaveWhatsAppNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waLabelInput.trim() || !waPhoneInput.trim()) return;
    DataEngine.saveWhatsAppNumber({
      id: editingWaId || undefined,
      label: waLabelInput,
      phone_number: waPhoneInput,
      department: waDeptInput,
      default_greeting: waGreetingInput,
    });
    setEditingWaId(null);
    setWaLabelInput('');
    setWaPhoneInput('');
    setWaDeptInput('Admisión');
    loadData();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white border border-ic-border w-full max-w-md p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-8 bg-ic-red" />
            <div>
              <h1 className="text-2xl font-serif font-bold text-ic-dark tracking-tight">
                TRACE IC
              </h1>
              <p className="text-xs text-ic-muted uppercase tracking-widest mt-0.5">
                Instituto Continental
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsAuthenticated(true);
            }}
            className="space-y-5"
          >
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1.5">
                Usuario Administrador
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-ic-border focus:outline-none focus:border-ic-dark"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-ic-border focus:outline-none focus:border-ic-dark"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Acceder a la Plataforma
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-ic-dark flex flex-col">
      {/* =====================================================================
          CABECERA SUPERIOR CON ICONOS SVG Y 3 MÓDULOS
         ===================================================================== */}
      <header className="bg-white border-b border-ic-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Marca Institucional */}
          <div className="flex items-center gap-3.5">
            <div className="w-1.5 h-7 bg-ic-red" />
            <div className="flex items-center gap-2.5">
              <span className="font-serif font-bold text-lg tracking-tight text-ic-dark">
                TRACE IC
              </span>
              <span className="hidden sm:inline-block text-[11px] font-mono text-ic-muted px-2 py-0.5 bg-gray-100">
                trace.icontinental.edu.pe
              </span>
            </div>
          </div>

          {/* Navegación Central con Iconos SVG */}
          <nav className="flex items-center h-full space-x-6 md:space-x-8">
            <button
              onClick={() => setActiveModule('reports')}
              className={`h-full flex items-center gap-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeModule === 'reports'
                  ? 'border-ic-red text-ic-dark'
                  : 'border-transparent text-ic-muted hover:text-ic-dark'
              }`}
            >
              <BarChart3
                className={`w-4 h-4 ${
                  activeModule === 'reports' ? 'text-ic-red' : 'text-ic-muted'
                }`}
              />
              <span>01. Reportería</span>
            </button>

            <button
              onClick={() => setActiveModule('generator')}
              className={`h-full flex items-center gap-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeModule === 'generator'
                  ? 'border-ic-red text-ic-dark'
                  : 'border-transparent text-ic-muted hover:text-ic-dark'
              }`}
            >
              <Link2
                className={`w-4 h-4 ${
                  activeModule === 'generator' ? 'text-ic-red' : 'text-ic-muted'
                }`}
              />
              <span>02. Generador de Enlaces</span>
            </button>

            <button
              onClick={() => setActiveModule('tools')}
              className={`h-full flex items-center gap-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeModule === 'tools'
                  ? 'border-ic-red text-ic-dark'
                  : 'border-transparent text-ic-muted hover:text-ic-dark'
              }`}
            >
              <SlidersHorizontal
                className={`w-4 h-4 ${
                  activeModule === 'tools' ? 'text-ic-red' : 'text-ic-muted'
                }`}
              />
              <span>03. WhatsApp y Herramientas</span>
            </button>
          </nav>

          {/* Acciones de Sesión */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-ic-muted hover:text-ic-dark border border-ic-border bg-white"
              title="Actualizar datos"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="p-2 text-ic-muted hover:text-ic-red"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          CONTENIDO PRINCIPAL
         ===================================================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* ===================================================================
            MÓDULO 01: REPORTERÍA Y CONTEOS
           =================================================================== */}
        {activeModule === 'reports' && (
          <>
            {/* Encabezado + Único botón Exportar CSV */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-ic-border pb-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-ic-red mb-1">
                  Módulo 01 • Reportería de Marketing
                </div>
                <h1 className="text-3xl font-serif font-bold text-ic-dark">
                  Conteo General por Canal, Campaña y Subcampaña
                </h1>
              </div>

              <button
                onClick={handleExportReportCsv}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-ic-dark hover:bg-black text-white text-xs font-medium tracking-wide transition-colors self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Reporte CSV
              </button>
            </div>

            {/* BARRA DE FILTROS DE FECHA (CON CALENDARIO Y ATAJOS) Y CAMPAÑA (ORIGEN) */}
            <div className="bg-white border border-ic-border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Atajos rápidos de fecha */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ic-muted mr-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-ic-red" />
                    Periodo:
                  </span>
                  {(
                    [
                      ['today', 'Hoy'],
                      ['this_week', 'Esta semana'],
                      ['last_7_days', 'Últimos 7 días'],
                      ['last_30_days', '30 días antes'],
                      ['last_month', 'Mes pasado'],
                      ['all', 'Todo'],
                    ] as [DatePreset, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyDatePreset(key)}
                      className={`px-2.5 py-1 text-xs border transition-colors ${
                        datePreset === key
                          ? 'bg-ic-red text-white border-ic-red font-medium'
                          : 'bg-white text-ic-slate border-ic-border hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Calendario de Rango de Fechas (Desde - Hasta) + Filtro de Campaña Origen */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-ic-muted">Desde:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="px-2 py-1 text-xs font-mono border border-ic-border bg-white focus:outline-none focus:border-ic-dark"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-ic-muted">Hasta:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="px-2 py-1 text-xs font-mono border border-ic-border bg-white focus:outline-none focus:border-ic-dark"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs pl-2 border-l border-ic-border">
                    <span className="text-ic-muted font-medium">Campaña (Origen):</span>
                    <select
                      value={reportCampaignFilter}
                      onChange={(e) => setReportCampaignFilter(e.target.value)}
                      className="px-2.5 py-1 text-xs font-mono border border-ic-border bg-white font-semibold text-ic-dark"
                    >
                      <option value="all">Todas (202710–202930)</option>
                      {CAMPAIGN_ORIGINS.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. CONTEO GENERAL POR CANAL */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-serif font-bold text-ic-dark uppercase tracking-wider">
                  1. Conteo General por Canal
                </h2>
                {selectedChannelFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedChannelFilter('all')}
                    className="text-xs text-ic-red font-medium hover:underline"
                  >
                    Ver todos los canales
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 bg-white border border-ic-border divide-y sm:divide-y-0 sm:divide-x divide-ic-border">
                <button
                  onClick={() => setSelectedChannelFilter('all')}
                  className={`p-5 text-left transition-colors ${
                    selectedChannelFilter === 'all' ? 'bg-ic-redSoft/60' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
                    Total General
                  </div>
                  <div className="mt-2 text-3xl font-serif font-bold text-ic-dark tabular-nums">
                    {channelTotals.grandTotalClicks.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-ic-muted tabular-nums">
                    {channelTotals.grandTotalUnique.toLocaleString()} personas únicas
                  </div>
                </button>

                {(Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((ch) => {
                  const stat = channelTotals.byChannel[ch];
                  const pct = Math.round(
                    (stat.clicks / Math.max(1, channelTotals.grandTotalClicks)) * 100
                  );
                  const isSelected = selectedChannelFilter === ch;
                  return (
                    <button
                      key={ch}
                      onClick={() => setSelectedChannelFilter(isSelected ? 'all' : ch)}
                      className={`p-5 text-left transition-colors relative ${
                        isSelected ? 'bg-ic-redSoft/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-ic-red" />
                      )}
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
                        <span className="truncate">{CHANNEL_LABELS[ch]}</span>
                        <span className="text-ic-red font-mono">{pct}%</span>
                      </div>
                      <div className="mt-2 text-2xl font-serif font-bold text-ic-dark tabular-nums">
                        {stat.clicks.toLocaleString()}
                      </div>
                      <div className="mt-1 text-[11px] text-ic-muted tabular-nums">
                        {stat.unique.toLocaleString()} únicos
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. DESGLOSE POR CAMPAÑA (ORIGEN) Y SUBCAMPAÑA */}
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-serif font-bold text-ic-dark uppercase tracking-wider">
                  2. Subdivisiones por Campaña (Origen) y Subcampaña / Conjunto de Anuncios
                </h2>
              </div>

              <div className="space-y-6">
                {hierarchicalReport.map((channelBlock) => (
                  <div
                    key={channelBlock.channel}
                    className="bg-white border border-ic-border"
                  >
                    <div className="px-6 py-4 bg-white border-b border-ic-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-ic-red" />
                        <h3 className="text-base font-serif font-bold text-ic-dark">
                          {channelBlock.channelLabel}
                        </h3>
                      </div>
                      <div className="flex items-center gap-6 text-xs tabular-nums">
                        <span>
                          Total Canal:{' '}
                          <strong className="font-bold text-ic-dark text-sm">
                            {channelBlock.totalClicks.toLocaleString()} clics
                          </strong>
                        </span>
                        <span className="text-ic-muted">
                          {channelBlock.totalUnique.toLocaleString()} únicos
                        </span>
                      </div>
                    </div>

                    {channelBlock.campaigns.length === 0 ? (
                      <div className="p-6 text-xs text-ic-muted">
                        Sin clics registrados en el rango de fechas seleccionado.
                      </div>
                    ) : (
                      <div className="divide-y divide-ic-border">
                        {channelBlock.campaigns.map((camp) => {
                          const expandKey = `${channelBlock.channel}::${camp.campaign}`;
                          const isOpen = expandedCampaigns[expandKey] ?? true;

                          return (
                            <div key={expandKey}>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCampaigns((prev) => ({
                                    ...prev,
                                    [expandKey]: !isOpen,
                                  }))
                                }
                                className="w-full px-6 py-3 bg-[#FAFAFA] hover:bg-gray-100 flex items-center justify-between text-left"
                              >
                                <div className="flex items-center gap-2.5">
                                  {isOpen ? (
                                    <ChevronDown className="w-4 h-4 text-ic-red" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-ic-muted" />
                                  )}
                                  <span className="text-xs font-semibold uppercase tracking-wider text-ic-muted">
                                    Campaña (Origen):
                                  </span>
                                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-ic-border text-ic-red">
                                    {camp.campaign}
                                  </span>
                                  <span className="text-[11px] text-ic-muted">
                                    ({camp.subcampaigns.length} subcampañas)
                                  </span>
                                </div>

                                <div className="flex items-center gap-6 text-xs tabular-nums">
                                  <span className="font-bold text-ic-dark">
                                    {camp.clicks.toLocaleString()} clics
                                  </span>
                                  <span className="text-ic-muted w-24 text-right">
                                    {camp.unique.toLocaleString()} únicos
                                  </span>
                                </div>
                              </button>

                              {isOpen && (
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-t border-b border-ic-border bg-white text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                                      <th className="py-2 pl-12 pr-4">
                                        {channelBlock.channel === 'web_institucional'
                                          ? 'Subcampaña (Carrera o Página Detectada)'
                                          : channelBlock.channel === 'tiktok_ads'
                                          ? 'Subcampaña / Conjunto de Anuncios'
                                          : 'Subcampaña'}
                                      </th>
                                      <th className="py-2 px-4">Enlace / URL Origen</th>
                                      <th className="py-2 px-4 w-44">Proporción</th>
                                      <th className="py-2 px-4 text-right">Clics</th>
                                      <th className="py-2 pr-6 pl-4 text-right w-28">Únicos</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-xs">
                                    {camp.subcampaigns.map((sub) => {
                                      const pct = Math.round(
                                        (sub.clicks / Math.max(1, camp.clicks)) * 100
                                      );
                                      return (
                                        <tr key={sub.id} className="hover:bg-gray-50/80">
                                          <td className="py-2.5 pl-12 pr-4 font-medium text-ic-dark">
                                            {sub.subcampaign}
                                          </td>
                                          <td className="py-2.5 px-4 font-mono text-[11px] text-ic-muted">
                                            {sub.url_reference || sub.short_link}
                                          </td>
                                          <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-2">
                                              <div className="flex-1 h-1.5 bg-gray-100 overflow-hidden">
                                                <div
                                                  className="h-full bg-ic-red"
                                                  style={{ width: `${pct}%` }}
                                                />
                                              </div>
                                              <span className="text-[10px] font-mono text-ic-muted w-8 text-right">
                                                {pct}%
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-4 text-right font-bold text-ic-dark tabular-nums">
                                            {sub.clicks.toLocaleString()}
                                          </td>
                                          <td className="py-2.5 pr-6 pl-4 text-right text-ic-muted tabular-nums">
                                            {sub.unique_visitors.toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 3. RANKING DE CARRERAS DEL SITIO WEB (/carrera/...) */}
            <section className="bg-white border border-ic-border p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ic-border pb-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-ic-red">
                    Sitio Web Institucional (icontinental.edu.pe/carrera/...)
                  </div>
                  <h2 className="text-lg font-serif font-bold text-ic-dark mt-0.5">
                    Ranking de Carreras que Generan Más Clics
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {websiteCareersRanking.map((career, idx) => {
                  const max = websiteCareersRanking[0]?.clicks || 1;
                  const widthPct = Math.round((career.clicks / max) * 100);
                  return (
                    <div
                      key={career.id}
                      className="py-2 border-b border-gray-100 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-ic-red font-bold w-5">
                            0{idx + 1}
                          </span>
                          <span className="font-semibold text-ic-dark">
                            {career.subcampaign}
                          </span>
                        </div>
                        <span className="font-bold text-ic-dark tabular-nums">
                          {career.clicks.toLocaleString()} clics
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pl-7">
                        <span className="text-[11px] font-mono text-ic-muted truncate">
                          {career.url_reference}
                        </span>
                        <div className="w-28 h-1.5 bg-gray-100 flex-shrink-0">
                          <div
                            className="h-full bg-ic-dark"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ===================================================================
            MÓDULO 02: GENERADOR DE ENLACES
           =================================================================== */}
        {activeModule === 'generator' && (
          <div className="space-y-8">
            <div className="border-b border-ic-border pb-5">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-ic-red mb-1">
                Módulo 02 • Creación y Enlaces Activos
              </div>
              <h1 className="text-3xl font-serif font-bold text-ic-dark">
                Generador Unificado de Enlaces
              </h1>
              <p className="text-xs text-ic-muted mt-1">
                Visualiza primero el resultado de tu enlace normal con parámetros (<code className="font-mono text-ic-dark">/CRM</code>, <code className="font-mono text-ic-dark">/tiktok</code>, etc.) y decide si deseas usar un alias corto.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* FORMULARIO UNIFICADO */}
              <div className="lg:col-span-5 bg-white border border-ic-border p-6 space-y-5">
                <div className="flex items-center gap-2.5 border-b border-ic-border pb-3">
                  <div className="w-1.5 h-5 bg-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    Configurar Nuevo Enlace
                  </h2>
                </div>

                <form onSubmit={handleCreateLink} className="space-y-5">
                  {/* 1. CANAL */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1.5">
                      1. CANAL *
                    </label>
                    <select
                      value={genChannel}
                      onChange={(e) => setGenChannel(e.target.value as ChannelKey)}
                      className="w-full px-3 py-2.5 text-xs font-medium border border-ic-border bg-white focus:outline-none focus:border-ic-dark"
                    >
                      <option value="mailing_sms_chattigo">
                        Mailing / SMS / Chattigo (Slug base: /CRM)
                      </option>
                      <option value="tiktok_ads">TikTok Ads (Slug base: /tiktok)</option>
                      <option value="landing_page">Landing Pages (Slug base: /landing)</option>
                      <option value="web_institucional">
                        Sitio Web Institucional (Slug base: /whatsapp-web)
                      </option>
                    </select>
                  </div>

                  {/* 2. CAMPAÑA (ORIGEN) * — SELECT 202710 A 202930 */}
                  <div className="grid grid-cols-1 gap-4 p-4 bg-[#FAFAFA] border border-ic-border">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-dark mb-1.5">
                        2. CAMPAÑA (ORIGEN) *
                      </label>
                      <select
                        value={genCampaign}
                        onChange={(e) => setGenCampaign(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-ic-border bg-white text-ic-dark focus:outline-none focus:border-ic-red"
                      >
                        {CAMPAIGN_ORIGINS.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. SUBCAMPAÑA */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-dark mb-1.5">
                        3. SUBCAMPAÑA {genChannel === 'tiktok_ads' ? '(CONJUNTO DE ANUNCIOS)' : ''} *
                      </label>
                      <input
                        type="text"
                        required
                        value={genSubcampaign}
                        onChange={(e) => setGenSubcampaign(e.target.value)}
                        placeholder={
                          genChannel === 'mailing_sms_chattigo'
                            ? 'Ej: sms-cierre-inscripciones o chattigo-becas'
                            : genChannel === 'tiktok_ads'
                            ? 'Ej: Conjunto 01 - Diseño de Modas'
                            : 'Ej: Botón Principal'
                        }
                        className="w-full px-3 py-2 text-xs border border-ic-border bg-white focus:outline-none focus:border-ic-dark"
                      />
                    </div>
                  </div>

                  {/* 4. DESTINO */}
                  <div className="space-y-3">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
                      4. DESTINO DEL ENLACE
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setGenDestType('whatsapp')}
                        className={`py-2 px-3 border text-xs font-medium flex items-center justify-center gap-2 ${
                          genDestType === 'whatsapp'
                            ? 'border-ic-dark bg-ic-dark text-white'
                            : 'border-ic-border bg-white text-ic-dark hover:bg-gray-50'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Hacia WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenDestType('url')}
                        className={`py-2 px-3 border text-xs font-medium flex items-center justify-center gap-2 ${
                          genDestType === 'url'
                            ? 'border-ic-dark bg-ic-dark text-white'
                            : 'border-ic-border bg-white text-ic-dark hover:bg-gray-50'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Hacia Página Web
                      </button>
                    </div>

                    {genDestType === 'whatsapp' ? (
                      <div className="space-y-3 pt-1">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-ic-slate">Número de WhatsApp</label>
                            <button
                              type="button"
                              onClick={() => setActiveModule('tools')}
                              className="text-[11px] text-ic-red hover:underline font-medium"
                            >
                              Configurar números →
                            </button>
                          </div>
                          <select
                            value={genWaPhone}
                            onChange={(e) => setGenWaPhone(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                          >
                            {waNumbers.map((w) => (
                              <option key={w.id} value={w.phone_number}>
                                {w.label} (+{w.phone_number})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-ic-slate mb-1">
                            Mensaje de saludo en WhatsApp
                          </label>
                          <textarea
                            rows={2}
                            value={genWaMessage}
                            onChange={(e) => setGenWaMessage(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-ic-border bg-white focus:outline-none focus:border-ic-dark"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <label className="block text-xs text-ic-slate mb-1">
                          URL de Destino Final
                        </label>
                        <input
                          type="url"
                          required
                          value={genDestUrl}
                          onChange={(e) => setGenDestUrl(e.target.value)}
                          placeholder="https://icontinental.edu.pe/admision/"
                          className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* 5. RESULTADO DEL ENLACE NORMAL (VISIBLE ANTES DE DECIDIR SI SE USA ALIAS CORTO) */}
                  <div className="p-4 bg-[#FAFAFA] border-l-2 border-l-ic-red border border-ic-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-ic-dark">
                        5. Resultado del Enlace Normal:
                      </span>
                      <span className="text-[10px] font-mono text-ic-red bg-ic-redSoft px-2 py-0.5">
                        Listo sin alias
                      </span>
                    </div>

                    <div className="p-2.5 bg-white border border-ic-border font-mono text-[11px] text-ic-dark break-all select-all">
                      {previewNormalUrl}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(previewNormalUrl, 'normal-preview')}
                        className="px-3 py-1.5 bg-white border border-ic-border hover:bg-gray-50 text-ic-dark text-xs font-medium flex items-center gap-1.5"
                      >
                        {copiedKey === 'normal-preview' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-700" /> Enlace Normal Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Enlace Normal
                          </>
                        )}
                      </button>

                      <label className="flex items-center gap-2 text-xs font-medium text-ic-dark cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useShortAlias}
                          onChange={(e) => setUseShortAlias(e.target.checked)}
                          className="accent-ic-red"
                        />
                        Quiero usar un alias corto
                      </label>
                    </div>

                    {/* Solo si el usuario decide que quiere un alias corto */}
                    {useShortAlias && (
                      <div className="pt-3 mt-2 border-t border-ic-border space-y-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-red">
                          Escribe tu Alias Corto:
                        </label>
                        <div className="flex items-center border border-ic-border bg-white">
                          <span className="px-2.5 py-2 bg-gray-50 text-[11px] font-mono text-ic-muted border-r border-ic-border">
                            trace.icontinental.edu.pe/
                          </span>
                          <input
                            type="text"
                            required={useShortAlias}
                            value={customSlug}
                            onChange={(e) =>
                              setCustomSlug(
                                e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '-')
                              )
                            }
                            placeholder="ej: sms-cierre o tt-modas"
                            className="w-full px-2.5 py-2 text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <div className="text-[11px] font-mono text-ic-muted">
                          Quedará como: <strong className="text-ic-dark">{previewShortAliasUrl}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {useShortAlias
                      ? 'Guardar con Alias Corto en mi Tabla'
                      : 'Registrar Enlace Normal en mi Tabla'}
                  </button>

                  {genFeedbackUrl && (
                    <div className="p-3 bg-green-50 border border-green-200 text-xs flex items-center justify-between">
                      <span className="font-mono font-semibold text-green-900 truncate mr-2">
                        {genFeedbackUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(genFeedbackUrl, 'saved-url')}
                        className="px-2.5 py-1 bg-green-800 text-white text-[11px] font-medium flex-shrink-0"
                      >
                        {copiedKey === 'saved-url' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* LISTA DE ENLACES REGISTRADOS */}
              <div className="lg:col-span-7 bg-white border border-ic-border">
                <div className="p-5 border-b border-ic-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-serif font-bold text-ic-dark">
                      Enlaces Registrados ({links.length})
                    </h2>
                    <p className="text-xs text-ic-muted">
                      Incluye el enlace maestro <code className="font-mono text-ic-red">/CRM</code> y todos tus enlaces por campaña.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-ic-muted absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      placeholder="Buscar por 202710, /CRM, subcampaña..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-ic-border focus:outline-none focus:border-ic-dark"
                    />
                  </div>
                </div>

                <div className="divide-y divide-ic-border">
                  {links
                    .filter(
                      (l) =>
                        l.title.toLowerCase().includes(linkSearch.toLowerCase()) ||
                        l.slug.toLowerCase().includes(linkSearch.toLowerCase()) ||
                        l.campaign.toLowerCase().includes(linkSearch.toLowerCase()) ||
                        l.subcampaign.toLowerCase().includes(linkSearch.toLowerCase())
                    )
                    .map((link) => {
                      const activeUrl = `https://trace.icontinental.edu.pe/${link.slug}`;
                      return (
                        <div
                          key={link.id}
                          className="p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-ic-dark">
                                {CHANNEL_LABELS[link.channel]}
                              </span>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-ic-redSoft text-ic-red">
                                {link.campaign}
                              </span>
                              <span className="text-xs font-semibold text-ic-dark">
                                {link.subcampaign}
                              </span>
                            </div>

                            <div className="font-mono text-xs font-bold text-ic-red break-all">
                              {activeUrl}
                            </div>

                            {link.has_custom_alias && (
                              <div className="text-[11px] font-mono text-ic-muted truncate">
                                Enlace normal equivalente: {link.normal_url}
                              </div>
                            )}

                            <div className="text-xs text-ic-muted">
                              {link.title} •{' '}
                              <strong className="text-ic-dark tabular-nums">
                                {link.total_clicks.toLocaleString()} clics
                              </strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                            <button
                              onClick={() => copyToClipboard(activeUrl, `link-${link.id}`)}
                              className="px-3 py-2 bg-ic-dark hover:bg-black text-white text-xs font-medium flex items-center gap-1.5"
                            >
                              {copiedKey === `link-${link.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> Copiar
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setQrSelectedUrl(activeUrl);
                                setActiveModule('tools');
                              }}
                              className="p-2 text-ic-dark hover:text-ic-red border border-ic-border bg-white"
                              title="Generar Código QR para este enlace"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {!link.is_master_route && (
                              <button
                                onClick={() => {
                                  DataEngine.deleteLink(link.id);
                                  loadData();
                                }}
                                className="p-2 text-ic-muted hover:text-ic-red border border-ic-border bg-white"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MÓDULO 03: WHATSAPP Y HERRAMIENTAS AVANZADAS
            (Configuración de Números WhatsApp + Generador QR + Simulador Anti-Bots)
           =================================================================== */}
        {activeModule === 'tools' && (
          <div className="space-y-8">
            <div className="border-b border-ic-border pb-5">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-ic-red mb-1">
                Módulo 03 • Configuración y Utilidades
              </div>
              <h1 className="text-3xl font-serif font-bold text-ic-dark">
                Números de WhatsApp, Códigos QR y Verificador de Tráfico
              </h1>
            </div>

            {/* BLOQUE 1: CONFIGURACIÓN DE NÚMEROS DE WHATSAPP */}
            <section className="bg-white border border-ic-border p-6 space-y-5">
              <div className="flex items-center gap-2.5 border-b border-ic-border pb-3">
                <Phone className="w-4 h-4 text-ic-red" />
                <div>
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    1. Configuración de Números de WhatsApp del Instituto
                  </h2>
                  <p className="text-xs text-ic-muted">
                    Administra aquí los teléfonos institucionales. Al editar un número, se actualiza para todos los enlaces que lo utilicen.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 border border-ic-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-ic-border bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                        <th className="py-2.5 px-4">Etiqueta / Canal</th>
                        <th className="py-2.5 px-4">Área</th>
                        <th className="py-2.5 px-4">Teléfono</th>
                        <th className="py-2.5 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ic-border text-xs">
                      {waNumbers.map((w) => (
                        <tr key={w.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-ic-dark">{w.label}</td>
                          <td className="py-3 px-4 text-ic-muted">{w.department}</td>
                          <td className="py-3 px-4 font-mono font-bold text-ic-red">
                            +{w.phone_number}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingWaId(w.id);
                                  setWaLabelInput(w.label);
                                  setWaPhoneInput(w.phone_number);
                                  setWaDeptInput(w.department);
                                  setWaGreetingInput(w.default_greeting);
                                }}
                                className="px-2 py-1 text-[11px] border border-ic-border bg-white hover:bg-gray-100 flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Editar
                              </button>
                              {waNumbers.length > 1 && (
                                <button
                                  onClick={() => {
                                    DataEngine.deleteWhatsAppNumber(w.id);
                                    loadData();
                                  }}
                                  className="p-1 text-ic-muted hover:text-ic-red"
                                  title="Eliminar número"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form
                  onSubmit={handleSaveWhatsAppNumber}
                  className="lg:col-span-5 bg-[#FAFAFA] border border-ic-border p-4 space-y-3"
                >
                  <div className="text-xs font-serif font-bold text-ic-dark">
                    {editingWaId ? 'Editar Número de WhatsApp' : 'Agregar Nuevo Número de WhatsApp'}
                  </div>
                  <div>
                    <label className="block text-[11px] text-ic-muted mb-1">
                      Nombre Identificador *
                    </label>
                    <input
                      type="text"
                      required
                      value={waLabelInput}
                      onChange={(e) => setWaLabelInput(e.target.value)}
                      placeholder="Ej: WhatsApp Admisión Pregrado"
                      className="w-full px-3 py-1.5 text-xs border border-ic-border bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-ic-muted mb-1">
                        Teléfono (con 51) *
                      </label>
                      <input
                        type="text"
                        required
                        value={waPhoneInput}
                        onChange={(e) => setWaPhoneInput(e.target.value)}
                        placeholder="51987654321"
                        className="w-full px-3 py-1.5 text-xs font-mono border border-ic-border bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-ic-muted mb-1">Área</label>
                      <input
                        type="text"
                        value={waDeptInput}
                        onChange={(e) => setWaDeptInput(e.target.value)}
                        placeholder="Admisión"
                        className="w-full px-3 py-1.5 text-xs border border-ic-border bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold uppercase tracking-wider"
                    >
                      {editingWaId ? 'Actualizar Número' : 'Guardar Número'}
                    </button>
                    {editingWaId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWaId(null);
                          setWaLabelInput('');
                          setWaPhoneInput('');
                        }}
                        className="px-3 py-2 border border-ic-border bg-white text-xs"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </section>

            {/* BLOQUE 2 Y 3: GENERADOR DE CÓDIGOS QR + SIMULADOR DE TRÁFICO / ANTI-BOTS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Generador de Códigos QR */}
              <div className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <QrCode className="w-4 h-4 text-ic-red" />
                  <div>
                    <h2 className="text-base font-serif font-bold text-ic-dark">
                      2. Generador de Código QR (SVG Vectorial y PNG)
                    </h2>
                    <p className="text-xs text-ic-muted">
                      Descarga el QR de cualquiera de tus enlaces para piezas gráficas o afiches.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                    Seleccionar Enlace
                  </label>
                  <select
                    value={qrSelectedUrl}
                    onChange={(e) => setQrSelectedUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                  >
                    {links.map((l) => {
                      const u = `https://trace.icontinental.edu.pe/${l.slug}`;
                      return (
                        <option key={l.id} value={u}>
                          /{l.slug} — {l.title}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-[#FAFAFA] border border-ic-border">
                  <div className="bg-white p-3 border border-ic-border">
                    {qrPngUrl && (
                      <img src={qrPngUrl} alt="QR Trace IC" className="w-36 h-36 object-contain" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQrColor('#111827')}
                        className={`px-2.5 py-1 text-xs border ${
                          qrColor === '#111827'
                            ? 'bg-ic-dark text-white border-ic-dark'
                            : 'bg-white text-ic-dark border-ic-border'
                        }`}
                      >
                        Negro
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrColor('#E4000B')}
                        className={`px-2.5 py-1 text-xs border ${
                          qrColor === '#E4000B'
                            ? 'bg-ic-red text-white border-ic-red'
                            : 'bg-white text-ic-dark border-ic-border'
                        }`}
                      >
                        Rojo IC (#E4000B)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([qrSvgText], {
                          type: 'image/svg+xml;charset=utf-8',
                        });
                        const u = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = u;
                        a.download = 'QR-TraceIC.svg';
                        a.click();
                        URL.revokeObjectURL(u);
                      }}
                      className="w-full py-2 px-3 bg-ic-red text-white text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Vectorial SVG
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = qrPngUrl;
                        a.download = 'QR-TraceIC.png';
                        a.click();
                      }}
                      className="w-full py-2 px-3 bg-white border border-ic-border text-ic-dark text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar PNG (600px)
                    </button>
                  </div>
                </div>
              </div>

              {/* Probador de Clics y Filtro Anti-Bots (de la versión anterior) */}
              <div className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <ShieldCheck className="w-4 h-4 text-ic-red" />
                  <div>
                    <h2 className="text-base font-serif font-bold text-ic-dark">
                      3. Simulador de Clics y Filtro Anti-Bots
                    </h2>
                    <p className="text-xs text-ic-muted">
                      Prueba cómo el sistema suma clics humanos al instante y bloquea bots de vista previa de WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                      Subcampaña o Carrera a Probar
                    </label>
                    <select
                      value={simRecordId}
                      onChange={(e) => setSimRecordId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                    >
                      {records.map((r) => (
                        <option key={r.id} value={r.id}>
                          [{r.campaign}] {CHANNEL_LABELS[r.channel]} → {r.subcampaign}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                      Tipo de Acceso Simulado
                    </label>
                    <select
                      value={simIsBot ? 'bot' : 'human'}
                      onChange={(e) => setSimIsBot(e.target.value === 'bot')}
                      className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                    >
                      <option value="human">
                        Persona Real (Suma +1 clic en la Reportería)
                      </option>
                      <option value="bot">
                        Bot de Vista Previa de WhatsApp / Redes (Bloqueado por el filtro)
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const res = DataEngine.simulateTestClick({
                        recordId: simRecordId,
                        isBot: simIsBot,
                      });
                      setSimFeedback(res.message);
                      loadData();
                    }}
                    className="w-full py-2.5 bg-ic-dark hover:bg-black text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Ejecutar Prueba en Tiempo Real
                  </button>

                  {simFeedback && (
                    <div className="p-3 bg-[#FAFAFA] border border-ic-border text-xs font-medium text-ic-dark">
                      {simFeedback}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
