import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  FilterX,
  FlaskConical,
  Link2,
  Lock,
  LogOut,
  Mail,
  Phone,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AdvisorItem,
  buildDefaultWhatsAppMessage,
  CHANNEL_LABELS,
  ChannelKey,
  CRM_ORIGINS,
  isValidPeriodCode,
  LINK_ADS_PLATFORMS,
  LinkItem,
  PeriodItem,
  sanitizeCampaignInput,
  SubcampaignRecord,
  WhatsAppNumberItem,
} from './types/trace';
import { buildSystemTrackingUrl, DataEngine } from './services/dataEngine';
import { renderQrPngDataUrl, renderQrSvg } from './utils/qrGenerator';

type MainModule = 'reports' | 'generator' | 'tools';
type DatePreset =
  | 'custom'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_7_days'
  | 'last_week'
  | 'last_28_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'last_90_days'
  | 'this_year'
  | 'all';

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  custom: 'Personalizado',
  today: 'Hoy',
  yesterday: 'Ayer',
  this_week: 'Esta semana',
  last_7_days: 'Los últimos 7 días',
  last_week: 'La semana pasada',
  last_28_days: 'Los últimos 28 días',
  last_30_days: 'Los últimos 30 días',
  this_month: 'Este mes',
  last_month: 'El mes pasado',
  last_90_days: 'Los últimos 90 días',
  this_year: 'Este año (de enero a hoy)',
  all: 'Todo el historial',
};

const AUTH_STORAGE_KEY = 'trace_ic_auth_session_v2';

function formatShortDateEs(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  const y = parts[0];
  const mIdx = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
  const d = parseInt(parts[2], 10);
  return `${d} ${months[mIdx]} ${y}`;
}

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [loginEmail, setLoginEmail] = useState('admin@icontinental.edu.pe');
  const [loginPassword, setLoginPassword] = useState('TraceIC2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const [activeModule, setActiveModule] = useState<MainModule>('reports');

  // Estado sincronizado
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [activePeriod, setActivePeriod] = useState<string>('202710');
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [records, setRecords] = useState<SubcampaignRecord[]>([]);
  const [waNumbers, setWaNumbers] = useState<WhatsAppNumberItem[]>([]);

  // ===========================================================================
  // FILTRO DE FECHA CON 1 SOLO BOTÓN Y DROPDOWN (POR DEFECTO: "ESTE MES")
  // ===========================================================================
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState<string>('2026-11-01');
  const [endDate, setEndDate] = useState<string>('2026-11-30');
  // Estados temporales dentro del dropdown antes de pulsar "Aplicar"
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState<boolean>(false);
  const [tempPreset, setTempPreset] = useState<DatePreset>('this_month');
  const [tempStart, setTempStart] = useState<string>('2026-11-01');
  const [tempEnd, setTempEnd] = useState<string>('2026-11-30');
  const dateDropdownRef = useRef<HTMLDivElement | null>(null);

  const [reportPeriodFilter, setReportPeriodFilter] = useState<string>('all');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<ChannelKey | 'all'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ===========================================================================
  // MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ("¿Seguro que quieres eliminar?")
  // ===========================================================================
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // ===========================================================================
  // MODAL DE DEPURACIÓN DE CONTEOS Y PRUEBAS POR RANGO DE FECHAS
  // ===========================================================================
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [purgeStartDate, setPurgeStartDate] = useState<string>('2025-01-01');
  const [purgeEndDate, setPurgeEndDate] = useState<string>('2029-12-31');
  const [purgeMode, setPurgeMode] = useState<'purgeable_only' | 'specific_target'>(
    'purgeable_only'
  );
  const [purgeTargetId, setPurgeTargetId] = useState<string>('');
  const [purgeRemoveEmpty, setPurgeRemoveEmpty] = useState<boolean>(true);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);

  // ===========================================================================
  // GENERADOR DE ENLACES (Sin alias cortos manuales — el sistema genera con utm=)
  // ===========================================================================
  const [genChannel, setGenChannel] = useState<ChannelKey>('link_ads');
  const [genCampaignMode, setGenCampaignMode] = useState<'select' | 'new'>('select');
  const [genSelectedCampaign, setGenSelectedCampaign] = useState<string>('ADMISION_PREGRADO');
  const [genNewCampaignInput, setGenNewCampaignInput] = useState<string>('');
  const [genPeriod, setGenPeriod] = useState<string>('202710');

  // Escenarios según canal
  const [genLinkAdsUtm, setGenLinkAdsUtm] = useState<string>('tiktok-ads');
  const [genCrmOrigin, setGenCrmOrigin] = useState<string>('chattigo');
  const [genAdvisorName, setGenAdvisorName] = useState<string>('Gerber');
  const [genPortalSubsite, setGenPortalSubsite] = useState<string>('');

  const [genWaPhone, setGenWaPhone] = useState<string>('51987654321');
  const [genIsPurgeable, setGenIsPurgeable] = useState<boolean>(false);
  const [genFeedbackUrl, setGenFeedbackUrl] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState<string>('');

  // ===========================================================================
  // CONFIGURACIÓN: PERIODOS, ASESORES, WHATSAPP, QR Y SIMULADOR
  // ===========================================================================
  const [newPeriodInput, setNewPeriodInput] = useState<string>('');
  const [periodError, setPeriodError] = useState<string | null>(null);

  const [editingAdvisorId, setEditingAdvisorId] = useState<number | null>(null);
  const [advisorNameInput, setAdvisorNameInput] = useState<string>('');
  const [advisorPhoneInput, setAdvisorPhoneInput] = useState<string>('');

  const [editingWaId, setEditingWaId] = useState<number | null>(null);
  const [waLabelInput, setWaLabelInput] = useState('');
  const [waPhoneInput, setWaPhoneInput] = useState('');
  const [waDeptInput, setWaDeptInput] = useState('Admisión');

  const [qrSelectedUrl, setQrSelectedUrl] = useState<string>(
    'https://trace.icontinental.edu.pe/whatsapp-web?utm=portal-web&campana=PORTALWEB&periodo=202710'
  );
  const [qrColor, setQrColor] = useState<'#111827' | '#E4000B'>('#111827');
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [qrSvgText, setQrSvgText] = useState<string>('');

  const [simRecordId, setSimRecordId] = useState<string>('');
  const [simIsBot, setSimIsBot] = useState<boolean>(false);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  const isTestRecord = (r: SubcampaignRecord) =>
    Boolean(r.is_purgeable) || /prueba|test|demo|simulaci/i.test(r.subcampaign);

  const computeDatesForPreset = (preset: DatePreset): { start: string; end: string } => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const todayStr = fmt(now);

    if (preset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    if (preset === 'this_week') {
      const s = new Date(now);
      const day = s.getDay() || 7;
      s.setDate(s.getDate() - (day - 1));
      return { start: fmt(s), end: todayStr };
    }
    if (preset === 'last_7_days') {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { start: fmt(s), end: todayStr };
    }
    if (preset === 'last_week') {
      const endW = new Date(now);
      const day = endW.getDay() || 7;
      endW.setDate(endW.getDate() - day);
      const startW = new Date(endW);
      startW.setDate(startW.getDate() - 6);
      return { start: fmt(startW), end: fmt(endW) };
    }
    if (preset === 'last_28_days') {
      const s = new Date(now);
      s.setDate(s.getDate() - 27);
      return { start: fmt(s), end: todayStr };
    }
    if (preset === 'last_30_days') {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { start: fmt(s), end: todayStr };
    }
    if (preset === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: fmt(first), end: fmt(last) };
    }
    if (preset === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: fmt(first), end: fmt(last) };
    }
    if (preset === 'last_90_days') {
      const s = new Date(now);
      s.setDate(s.getDate() - 89);
      return { start: fmt(s), end: todayStr };
    }
    if (preset === 'this_year') {
      const first = new Date(now.getFullYear(), 0, 1);
      return { start: fmt(first), end: todayStr };
    }
    if (preset === 'all') {
      return { start: '2025-01-01', end: '2029-12-31' };
    }
    return { start: tempStart, end: tempEnd };
  };

  const refreshLocalState = () => {
    const loadedPeriods = DataEngine.getPeriods();
    const currentActivePeriod = DataEngine.getActivePeriod();
    const loadedCampaigns = DataEngine.getCampaigns();
    const loadedAdvisors = DataEngine.getAdvisors();
    const loadedLinks = DataEngine.getLinks();
    const loadedRecords = DataEngine.getRecords();
    const loadedWa = DataEngine.getWhatsAppNumbers();

    setPeriods(loadedPeriods);
    setActivePeriod(currentActivePeriod);
    setGenPeriod(currentActivePeriod);
    setCampaigns(loadedCampaigns);
    setAdvisors(loadedAdvisors);
    setLinks(loadedLinks);
    setRecords(loadedRecords);
    setWaNumbers(loadedWa);

    if (loadedAdvisors.length > 0 && !loadedAdvisors.some((a) => a.name === genAdvisorName)) {
      setGenAdvisorName(loadedAdvisors[0].name);
    }
    if (loadedRecords.length > 0 && !loadedRecords.some((r) => r.id === simRecordId)) {
      setSimRecordId(loadedRecords[0].id);
    }
    if (loadedRecords.length > 0 && !loadedRecords.some((r) => r.id === purgeTargetId)) {
      const firstTest = loadedRecords.find((r) => isTestRecord(r));
      setPurgeTargetId(firstTest ? firstTest.id : loadedRecords[0].id);
    }

    const exp: Record<string, boolean> = {};
    loadedRecords.forEach((r) => {
      exp[`${r.channel}::${r.period}`] = true;
    });
    setExpandedGroups((prev) => ({ ...exp, ...prev }));
  };

  const loadData = () => {
    refreshLocalState();
    void DataEngine.syncFromServer();
  };

  useEffect(() => {
    const initRange = computeDatesForPreset('this_month');
    setStartDate(initRange.start);
    setEndDate(initRange.end);
    setTempStart(initRange.start);
    setTempEnd(initRange.end);

    DataEngine.setOnSync(() => {
      refreshLocalState();
    });
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(ev.target as Node)
      ) {
        setIsDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const target = qrSelectedUrl || 'https://trace.icontinental.edu.pe/whatsapp-web';
    setQrPngUrl(renderQrPngDataUrl(target, qrColor, 600, 2));
    setQrSvgText(renderQrSvg(target, qrColor, 2));
  }, [qrSelectedUrl, qrColor]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    const res = await DataEngine.login(loginEmail, loginPassword);
    setLoginLoading(false);
    if (res.ok) {
      setIsAuthenticated(true);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, '1');
      } catch {
        // ignore
      }
    } else {
      setLoginError(res.error || 'Credenciales incorrectas.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    if (activeModule === 'generator') {
      setActiveModule('reports');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // ===========================================================================
  // CÁLCULO AUTOMÁTICO DE CAMPAÑA, UTM, TELÉFONO, MENSAJE Y ENLACE EN GENERADOR
  // ===========================================================================
  const effectiveCampaign = useMemo(() => {
    const raw =
      genCampaignMode === 'new' ? genNewCampaignInput : genSelectedCampaign;
    return sanitizeCampaignInput(raw) || 'PORTALWEB';
  }, [genCampaignMode, genNewCampaignInput, genSelectedCampaign]);

  const effectiveUtm = useMemo(() => {
    if (genChannel === 'link_ads') return genLinkAdsUtm;
    if (genChannel === 'mailing_sms_chattigo') return genCrmOrigin;
    if (genChannel === 'asesor_prospector') return genAdvisorName || 'Gerber';
    if (genPortalSubsite.trim()) {
      const clean = genPortalSubsite
        .trim()
        .replace(/^https?:\/\/(www\.)?icontinental\.edu\.pe\/?/i, '')
        .replace(/\/$/, '');
      return clean || 'portal-web';
    }
    return 'portal-web';
  }, [genChannel, genLinkAdsUtm, genCrmOrigin, genAdvisorName, genPortalSubsite]);

  const effectivePhone = useMemo(() => {
    if (genChannel === 'asesor_prospector') {
      const adv = advisors.find((a) => a.name === genAdvisorName);
      return adv ? adv.phone_number : genWaPhone;
    }
    return genWaPhone;
  }, [genChannel, genAdvisorName, advisors, genWaPhone]);

  const effectiveWaMessage = useMemo(() => {
    return buildDefaultWhatsAppMessage({
      channel: genChannel,
      campaign: effectiveCampaign,
      period: genPeriod || activePeriod,
      utmSource: effectiveUtm,
      advisorName: genAdvisorName,
      detectedUrl:
        genChannel === 'web_institucional' && genPortalSubsite.trim()
          ? genPortalSubsite.trim()
          : undefined,
    });
  }, [genChannel, effectiveCampaign, genPeriod, activePeriod, effectiveUtm, genAdvisorName, genPortalSubsite]);

  const generatedSystemUrl = useMemo(() => {
    return buildSystemTrackingUrl({
      channel: genChannel,
      campaign: effectiveCampaign,
      period: genPeriod || activePeriod,
      utmSource: effectiveUtm,
    });
  }, [genChannel, effectiveCampaign, genPeriod, activePeriod, effectiveUtm]);

  // ===========================================================================
  // FILTRADO DE REPORTERÍA (Por Fecha y por Periodo)
  // ===========================================================================
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchDate =
        r.last_activity_date >= startDate && r.last_activity_date <= endDate;
      const matchPeriod =
        reportPeriodFilter === 'all' || r.period === reportPeriodFilter;
      return matchDate && matchPeriod;
    });
  }, [records, startDate, endDate, reportPeriodFilter]);

  const purgeableRecordsCount = useMemo(() => {
    return records.filter((r) => isTestRecord(r)).length;
  }, [records]);

  const channelTotals = useMemo(() => {
    const map: Record<ChannelKey, { clicks: number; unique: number }> = {
      web_institucional: { clicks: 0, unique: 0 },
      link_ads: { clicks: 0, unique: 0 },
      mailing_sms_chattigo: { clicks: 0, unique: 0 },
      asesor_prospector: { clicks: 0, unique: 0 },
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

  // NUEVO BLOQUE EN MÓDULO 01: "Resultados por Campaña"
  const resultsByCampaign = useMemo(() => {
    const map = new Map<
      string,
      {
        campaign: string;
        period: string;
        attentionCode: string;
        clicks: number;
        unique: number;
        channels: Set<string>;
      }
    >();

    filteredRecords.forEach((r) => {
      const code = `${r.campaign}_${r.period}`;
      const current = map.get(code) || {
        campaign: r.campaign,
        period: r.period,
        attentionCode: code,
        clicks: 0,
        unique: 0,
        channels: new Set<string>(),
      };
      current.clicks += r.clicks;
      current.unique += r.unique_visitors;
      current.channels.add(CHANNEL_LABELS[r.channel]);
      map.set(code, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        channelsList: Array.from(item.channels),
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [filteredRecords]);

  const hierarchicalReport = useMemo(() => {
    const channelsOrder: ChannelKey[] = [
      'web_institucional',
      'link_ads',
      'mailing_sms_chattigo',
      'asesor_prospector',
    ];

    return channelsOrder
      .filter((ch) => selectedChannelFilter === 'all' || ch === selectedChannelFilter)
      .map((ch) => {
        const chRecords = filteredRecords.filter((r) => r.channel === ch);
        const periodsMap = new Map<
          string,
          {
            period: string;
            clicks: number;
            unique: number;
            subcampaigns: SubcampaignRecord[];
          }
        >();

        chRecords.forEach((rec) => {
          const current = periodsMap.get(rec.period) || {
            period: rec.period,
            clicks: 0,
            unique: 0,
            subcampaigns: [],
          };
          current.clicks += rec.clicks;
          current.unique += rec.unique_visitors;
          current.subcampaigns.push(rec);
          periodsMap.set(rec.period, current);
        });

        const periodsList = Array.from(periodsMap.values()).map((p) => ({
          ...p,
          subcampaigns: p.subcampaigns.sort((a, b) => b.clicks - a.clicks),
        }));

        const totalClicks = periodsList.reduce((s, p) => s + p.clicks, 0);
        const totalUnique = periodsList.reduce((s, p) => s + p.unique, 0);

        return {
          channel: ch,
          channelLabel: CHANNEL_LABELS[ch],
          totalClicks,
          totalUnique,
          periods: periodsList.sort((a, b) => b.clicks - a.clicks),
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
      'Periodo',
      'Campana',
      'Codigo_Atencion',
      'UTM_o_Asesor_o_Carrera',
      'Enlace',
      'Clics_Totales',
      'Personas_Unicas',
      'Fecha_Actividad',
    ];
    const rows = filteredRecords.map((r) => [
      `"${CHANNEL_LABELS[r.channel]}"`,
      `"${r.period}"`,
      `"${r.campaign}"`,
      `"${r.campaign}_${r.period}"`,
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

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenFeedbackUrl(null);
    try {
      const created = await DataEngine.createLink({
        channel: genChannel,
        period: genPeriod || activePeriod,
        campaign: effectiveCampaign,
        subcampaign: effectiveUtm,
        advisor_name: genChannel === 'asesor_prospector' ? genAdvisorName : undefined,
        destination_type: 'whatsapp',
        whatsapp_phone: effectivePhone,
        whatsapp_message: effectiveWaMessage,
        is_purgeable: genIsPurgeable,
      });
      setGenFeedbackUrl(created.normal_url);
      if (genCampaignMode === 'new') {
        setGenSelectedCampaign(effectiveCampaign);
        setGenCampaignMode('select');
        setGenNewCampaignInput('');
      }
      refreshLocalState();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al registrar el enlace');
    }
  };

  const handleExecutePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurgeLoading(true);
    setPurgeFeedback(null);
    const res = await DataEngine.purgeCounts({
      startDate: purgeStartDate,
      endDate: purgeEndDate,
      mode: purgeMode,
      targetId: purgeMode === 'specific_target' ? purgeTargetId : undefined,
      removeEmptyLinks: purgeRemoveEmpty,
    });
    setPurgeLoading(false);
    setPurgeFeedback(res.message);
    refreshLocalState();
  };

  // ===========================================================================
  // LOGIN SPLIT-SCREEN MINIMALISTA (50% IMAGEN IZQUIERDA / 50% LOGIN DERECHA)
  // ===========================================================================
  if (activeModule === 'generator' && !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex bg-white text-ic-dark">
        {/* MITAD IZQUIERDA (50%): Imagen Limpia a Pantalla Completa */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#0B0F17] overflow-hidden flex-col justify-between p-12">
          <img
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=85"
            alt="Instituto Continental"
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17]/90 via-transparent to-[#0B0F17]/50" />
          <div className="absolute top-0 left-0 w-2 h-full bg-ic-red" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-2 h-7 bg-ic-red" />
            <span className="font-serif font-bold text-xl tracking-tight text-white">
              TRACE IC
            </span>
          </div>

          <div className="relative z-10">
            <div className="text-xs font-mono uppercase tracking-widest text-white/80">
              Instituto Continental
            </div>
          </div>
        </div>

        {/* MITAD DERECHA (50%): Login Centrado y Minimalista */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-14 bg-white">
          <div>
            <button
              type="button"
              onClick={() => setActiveModule('reports')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-ic-muted hover:text-ic-dark"
            >
              <ArrowLeft className="w-4 h-4 text-ic-red" />
              Volver a Reportería
            </button>
          </div>

          <div className="w-full max-w-sm mx-auto my-auto space-y-6">
            <div className="space-y-1">
              <div className="w-8 h-1 bg-ic-red mb-3" />
              <h1 className="text-3xl font-serif font-bold text-ic-dark">
                Iniciar Sesión
              </h1>
              <p className="text-xs text-ic-muted">
                Generador de Enlaces • Trace IC
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border-l-2 border-l-ic-red text-xs text-red-900">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-dark mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ic-muted absolute left-3.5 top-2.5" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-xs border border-ic-border bg-[#FAFAFA] focus:bg-white focus:outline-none focus:border-ic-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-dark mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ic-muted absolute left-3.5 top-2.5" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-xs border border-ic-border bg-[#FAFAFA] focus:bg-white focus:outline-none focus:border-ic-dark"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                {loginLoading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <div className="text-[11px] text-ic-muted font-mono">
            trace.icontinental.edu.pe
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-ic-dark flex flex-col">
      {/* =====================================================================
          CABECERA SUPERIOR (Sin Generador en el menú central; botón a la derecha)
         ===================================================================== */}
      <header className="bg-white border-b border-ic-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Izquierda: Marca + Navegación Pública */}
          <div className="flex items-center gap-8 h-full">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-7 bg-ic-red" />
              <span className="font-serif font-bold text-lg tracking-tight text-ic-dark">
                TRACE IC
              </span>
            </div>

            <nav className="flex items-center h-full space-x-6">
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
                <span>Reportería</span>
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
                <span>Configuración</span>
              </button>
            </nav>
          </div>

          {/* Derecha: Periodo Global Activo + Botón Generador de Enlaces */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#FAFAFA] border border-ic-border text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                Periodo Activo:
              </span>
              <span className="font-mono font-bold text-ic-red">{activePeriod}</span>
            </div>

            <button
              onClick={loadData}
              className="p-2 text-ic-muted hover:text-ic-dark border border-ic-border bg-white"
              title="Actualizar datos"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveModule('generator')}
              className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                activeModule === 'generator'
                  ? 'bg-ic-red text-white'
                  : 'bg-ic-dark hover:bg-black text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Generador de Enlaces</span>
            </button>

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-2 text-ic-muted hover:text-ic-red border border-ic-border bg-white"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ("¿Seguro que quieres eliminar?")
         ===================================================================== */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-ic-border w-full max-w-md shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-ic-redSoft text-ic-red">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-ic-dark">
                  {confirmDelete.title}
                </h3>
                <p className="text-xs text-ic-muted mt-1">
                  {confirmDelete.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-ic-border">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-ic-border bg-white text-xs font-medium text-ic-dark hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await confirmDelete.onConfirm();
                    setConfirmDelete(null);
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : 'No se pudo eliminar');
                    setConfirmDelete(null);
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                className="px-4 py-2 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold uppercase tracking-wider"
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE DEPURACIÓN DE CONTEOS Y PRUEBAS POR RANGO DE FECHAS
         ===================================================================== */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-ic-border w-full max-w-lg shadow-xl">
            <div className="px-6 py-4 border-b border-ic-border flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-ic-red" />
                <h3 className="text-base font-serif font-bold text-ic-dark">
                  Depurar Conteos de Prueba
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="p-1 text-ic-muted hover:text-ic-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePurge} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAFAFA] border border-ic-border">
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-ic-muted mb-1">
                    Desde:
                  </span>
                  <input
                    type="date"
                    required
                    value={purgeStartDate}
                    onChange={(e) => setPurgeStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-ic-border bg-white"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-ic-muted mb-1">
                    Hasta:
                  </span>
                  <input
                    type="date"
                    required
                    value={purgeEndDate}
                    onChange={(e) => setPurgeEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-ic-border bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className={`flex items-center gap-2.5 p-3 border cursor-pointer text-xs ${
                    purgeMode === 'purgeable_only'
                      ? 'border-ic-red bg-ic-redSoft/40 font-semibold'
                      : 'border-ic-border bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="purgeMode"
                    checked={purgeMode === 'purgeable_only'}
                    onChange={() => setPurgeMode('purgeable_only')}
                    className="accent-ic-red"
                  />
                  <span>Todos los enlaces marcados como Depurables y pruebas</span>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-3 border cursor-pointer text-xs ${
                    purgeMode === 'specific_target'
                      ? 'border-ic-red bg-ic-redSoft/40'
                      : 'border-ic-border bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="purgeMode"
                    checked={purgeMode === 'specific_target'}
                    onChange={() => setPurgeMode('specific_target')}
                    className="mt-0.5 accent-ic-red"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Seleccionar un registro específico</div>
                    {purgeMode === 'specific_target' && (
                      <select
                        value={purgeTargetId}
                        onChange={(e) => setPurgeTargetId(e.target.value)}
                        className="mt-2 w-full px-2.5 py-2 text-xs border border-ic-border bg-white font-mono"
                      >
                        {records.map((r) => (
                          <option key={r.id} value={r.id}>
                            [{r.campaign}_{r.period}] {r.subcampaign} ({r.clicks} clics)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-ic-dark cursor-pointer">
                <input
                  type="checkbox"
                  checked={purgeRemoveEmpty}
                  onChange={(e) => setPurgeRemoveEmpty(e.target.checked)}
                  className="accent-ic-red"
                />
                <span>Eliminar el registro si queda con 0 clics</span>
              </label>

              {purgeFeedback && (
                <div className="p-3 bg-green-50 border border-green-200 text-xs text-green-900 font-medium">
                  {purgeFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ic-border">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(false)}
                  className="px-4 py-2 border border-ic-border bg-white text-xs font-medium"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={purgeLoading}
                  className="px-4 py-2 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold uppercase tracking-wider"
                >
                  {purgeLoading ? 'Depurando...' : 'Depurar Ahora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONTENIDO PRINCIPAL
         ===================================================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* ===================================================================
            MÓDULO 01: REPORTERÍA
           =================================================================== */}
        {activeModule === 'reports' && (
          <>
            {/* Barra Superior: Título + Filtro de Fecha en 1 solo botón con Dropdown + Periodo + Acciones */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-ic-border pb-5">
              <div>
                <h1 className="text-2xl font-serif font-bold text-ic-dark">
                  Reportería de Enlaces y Campañas
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1 SOLO BOTÓN DE FILTRO DE FECHA CON DROPDOWN (Estilo Google Analytics/Ads) */}
                <div className="relative" ref={dateDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setTempPreset(datePreset);
                      setTempStart(startDate);
                      setTempEnd(endDate);
                      setIsDateDropdownOpen((prev) => !prev);
                    }}
                    className="inline-flex items-center gap-2.5 px-3.5 py-2 bg-white border border-ic-border hover:border-ic-dark text-xs transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-ic-red" />
                    <span className="px-1.5 py-0.5 bg-gray-100 text-ic-slate font-medium">
                      {DATE_PRESET_LABELS[datePreset]}
                    </span>
                    <span className="font-mono text-ic-dark font-semibold">
                      {formatShortDateEs(startDate)} – {formatShortDateEs(endDate)}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-ic-muted" />
                  </button>

                  {isDateDropdownOpen && (
                    <div className="absolute right-0 mt-1 z-50 bg-white border border-ic-border shadow-2xl w-[340px] sm:w-[540px] flex flex-col sm:flex-row">
                      {/* Columna Izquierda: Lista de Opciones */}
                      <div className="sm:w-52 border-b sm:border-b-0 sm:border-r border-ic-border py-1.5 max-h-80 overflow-y-auto">
                        {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setTempPreset(key);
                              if (key !== 'custom') {
                                const r = computeDatesForPreset(key);
                                setTempStart(r.start);
                                setTempEnd(r.end);
                              }
                            }}
                            className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${
                              tempPreset === key
                                ? 'bg-ic-redSoft text-ic-red font-semibold'
                                : 'text-ic-dark hover:bg-gray-50'
                            }`}
                          >
                            <span>{DATE_PRESET_LABELS[key]}</span>
                          </button>
                        ))}
                      </div>

                      {/* Columna Derecha: Rango de Fechas + Botones Cancelar / Aplicar */}
                      <div className="flex-1 p-5 flex flex-col justify-between space-y-5">
                        <div className="space-y-4">
                          <div className="text-xs font-serif font-bold text-ic-dark">
                            Rango de Fechas Seleccionado
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                                Fecha de inicio
                              </label>
                              <input
                                type="date"
                                value={tempStart}
                                onChange={(e) => {
                                  setTempStart(e.target.value);
                                  setTempPreset('custom');
                                }}
                                className="w-full px-2.5 py-2 text-xs font-mono border border-ic-border bg-white focus:outline-none focus:border-ic-red"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                                Fecha de fin
                              </label>
                              <input
                                type="date"
                                value={tempEnd}
                                onChange={(e) => {
                                  setTempEnd(e.target.value);
                                  setTempPreset('custom');
                                }}
                                className="w-full px-2.5 py-2 text-xs font-mono border border-ic-border bg-white focus:outline-none focus:border-ic-red"
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-[#FAFAFA] border border-ic-border text-xs text-ic-muted">
                            Periodo seleccionado:{' '}
                            <strong className="text-ic-dark font-mono">
                              {formatShortDateEs(tempStart)} – {formatShortDateEs(tempEnd)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-ic-border">
                          <button
                            type="button"
                            onClick={() => setIsDateDropdownOpen(false)}
                            className="px-3.5 py-1.5 text-xs font-medium text-ic-muted hover:text-ic-dark"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDatePreset(tempPreset);
                              setStartDate(tempStart);
                              setEndDate(tempEnd);
                              setIsDateDropdownOpen(false);
                            }}
                            className="px-4 py-1.5 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold"
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selector de PERIODO */}
                <div className="flex items-center gap-1.5 bg-white border border-ic-border px-3 py-2 text-xs">
                  <span className="text-ic-muted font-medium">Periodo:</span>
                  <select
                    value={reportPeriodFilter}
                    onChange={(e) => setReportPeriodFilter(e.target.value)}
                    className="font-mono font-bold text-ic-dark bg-transparent focus:outline-none"
                  >
                    <option value="all">Todos</option>
                    {periods.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} {p.is_active ? '(Activo)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botón Depurar Pruebas */}
                <button
                  type="button"
                  onClick={() => {
                    setPurgeFeedback(null);
                    setIsPurgeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-ic-redSoft border border-ic-border text-xs font-medium"
                >
                  <FilterX className="w-3.5 h-3.5 text-ic-red" />
                  <span>Depurar</span>
                  {purgeableRecordsCount > 0 && (
                    <span className="px-1.5 bg-ic-red text-white text-[10px] font-mono font-bold">
                      {purgeableRecordsCount}
                    </span>
                  )}
                </button>

                {/* Exportar CSV */}
                <button
                  type="button"
                  onClick={handleExportReportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-ic-dark hover:bg-black text-white text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* 1. CONTEO GENERAL POR CANAL */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-serif font-bold text-ic-dark uppercase tracking-wider">
                  1. Conteo General por Canal
                </h2>
                {selectedChannelFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedChannelFilter('all')}
                    className="text-xs text-ic-red font-medium hover:underline"
                  >
                    Ver todos
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
                    {channelTotals.grandTotalUnique.toLocaleString()} únicos
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

            {/* 2. NUEVO BLOQUE: RESULTADOS POR CAMPAÑA */}
            <section className="bg-white border border-ic-border">
              <div className="px-6 py-4 border-b border-ic-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    2. Resultados por Campaña
                  </h2>
                </div>
                <span className="text-xs font-mono text-ic-muted">
                  {resultsByCampaign.length} campañas activas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-ic-border bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                      <th className="py-2.5 px-6">Campaña</th>
                      <th className="py-2.5 px-4">Periodo</th>
                      <th className="py-2.5 px-4">Código de Atención</th>
                      <th className="py-2.5 px-4">Canales Asociados</th>
                      <th className="py-2.5 px-4 w-44">Participación</th>
                      <th className="py-2.5 px-4 text-right">Clics</th>
                      <th className="py-2.5 pr-6 pl-4 text-right">Únicos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ic-border text-xs">
                    {resultsByCampaign.map((item) => {
                      const pct = Math.round(
                        (item.clicks / Math.max(1, channelTotals.grandTotalClicks)) * 100
                      );
                      return (
                        <tr key={item.attentionCode} className="hover:bg-gray-50">
                          <td className="py-3 px-6 font-mono font-bold text-ic-dark">
                            {item.campaign}
                          </td>
                          <td className="py-3 px-4 font-mono text-ic-slate">
                            {item.period}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-ic-redSoft text-ic-red font-mono font-bold text-[11px]">
                              {item.attentionCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ic-muted">
                            {item.channelsList.join(', ')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100">
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
                          <td className="py-3 px-4 text-right font-bold text-ic-dark tabular-nums">
                            {item.clicks.toLocaleString()}
                          </td>
                          <td className="py-3 pr-6 pl-4 text-right text-ic-muted tabular-nums">
                            {item.unique.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. SUBDIVISIONES POR CANAL, PERIODO, CAMPAÑA Y UTM / ASESOR */}
            <section className="space-y-4">
              <h2 className="text-xs font-serif font-bold text-ic-dark uppercase tracking-wider">
                3. Desglose por Canal, Periodo y Escenario (UTM / Asesor / Carrera)
              </h2>

              <div className="space-y-5">
                {hierarchicalReport.map((channelBlock) => (
                  <div
                    key={channelBlock.channel}
                    className="bg-white border border-ic-border"
                  >
                    <div className="px-6 py-3.5 bg-white border-b border-ic-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-ic-red" />
                        <h3 className="text-base font-serif font-bold text-ic-dark">
                          {channelBlock.channelLabel}
                        </h3>
                      </div>
                      <div className="flex items-center gap-6 text-xs tabular-nums">
                        <strong className="font-bold text-ic-dark text-sm">
                          {channelBlock.totalClicks.toLocaleString()} clics
                        </strong>
                        <span className="text-ic-muted">
                          {channelBlock.totalUnique.toLocaleString()} únicos
                        </span>
                      </div>
                    </div>

                    {channelBlock.periods.length === 0 ? (
                      <div className="p-6 text-xs text-ic-muted">
                        Sin registros en el rango de fechas seleccionado.
                      </div>
                    ) : (
                      <div className="divide-y divide-ic-border">
                        {channelBlock.periods.map((perBlock) => {
                          const expandKey = `${channelBlock.channel}::${perBlock.period}`;
                          const isOpen = expandedGroups[expandKey] ?? true;

                          return (
                            <div key={expandKey}>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedGroups((prev) => ({
                                    ...prev,
                                    [expandKey]: !isOpen,
                                  }))
                                }
                                className="w-full px-6 py-2.5 bg-[#FAFAFA] hover:bg-gray-100 flex items-center justify-between text-left"
                              >
                                <div className="flex items-center gap-2.5">
                                  {isOpen ? (
                                    <ChevronDown className="w-4 h-4 text-ic-red" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-ic-muted" />
                                  )}
                                  <span className="text-xs font-semibold uppercase tracking-wider text-ic-muted">
                                    Periodo:
                                  </span>
                                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-ic-border text-ic-red">
                                    {perBlock.period}
                                  </span>
                                </div>

                                <div className="flex items-center gap-6 text-xs tabular-nums">
                                  <span className="font-bold text-ic-dark">
                                    {perBlock.clicks.toLocaleString()} clics
                                  </span>
                                  <span className="text-ic-muted w-24 text-right">
                                    {perBlock.unique.toLocaleString()} únicos
                                  </span>
                                </div>
                              </button>

                              {isOpen && (
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-t border-b border-ic-border bg-white text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                                      <th className="py-2 pl-12 pr-4">Campaña</th>
                                      <th className="py-2 px-4">
                                        {channelBlock.channel === 'web_institucional'
                                          ? 'Carrera / Página Detectada'
                                          : channelBlock.channel === 'asesor_prospector'
                                          ? 'Asesor / Prospector'
                                          : 'UTM / Origen'}
                                      </th>
                                      <th className="py-2 px-4">Código de Atención</th>
                                      <th className="py-2 px-4 text-right">Clics</th>
                                      <th className="py-2 pr-6 pl-4 text-right w-32">Únicos</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-xs">
                                    {perBlock.subcampaigns.map((sub) => {
                                      const isPurgeableSub = isTestRecord(sub);
                                      return (
                                        <tr key={sub.id} className="hover:bg-gray-50/80">
                                          <td className="py-2.5 pl-12 pr-4 font-mono font-semibold text-ic-dark">
                                            {sub.campaign}
                                          </td>
                                          <td className="py-2.5 px-4 font-medium text-ic-dark">
                                            <div className="flex items-center gap-2">
                                              <span>{sub.subcampaign}</span>
                                              {isPurgeableSub && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                                                  PRUEBA
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-4 font-mono text-[11px] text-ic-muted">
                                            {sub.campaign}_{sub.period}
                                          </td>
                                          <td className="py-2.5 px-4 text-right font-bold text-ic-dark tabular-nums">
                                            {sub.clicks.toLocaleString()}
                                          </td>
                                          <td className="py-2.5 pr-6 pl-4 text-right text-ic-muted tabular-nums">
                                            <div className="inline-flex items-center justify-end gap-2">
                                              <span>{sub.unique_visitors.toLocaleString()}</span>
                                              {isPurgeableSub && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setPurgeMode('specific_target');
                                                    setPurgeTargetId(sub.id);
                                                    setPurgeStartDate('2025-01-01');
                                                    setPurgeEndDate('2029-12-31');
                                                    setPurgeRemoveEmpty(true);
                                                    setPurgeFeedback(null);
                                                    setIsPurgeModalOpen(true);
                                                  }}
                                                  className="px-1.5 py-0.5 text-[10px] font-medium text-ic-red hover:bg-ic-redSoft border border-ic-red/30"
                                                >
                                                  Limpiar
                                                </button>
                                              )}
                                            </div>
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

            {/* 4. RANKING DE CARRERAS DEL SITIO WEB (/carrera/...) */}
            <section className="bg-white border border-ic-border p-6 space-y-4">
              <div className="border-b border-ic-border pb-3">
                <h2 className="text-base font-serif font-bold text-ic-dark">
                  4. Ranking de Carreras del Portal Web (/carrera/...)
                </h2>
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
            GENERADOR DE ENLACES (Sin alias cortos manuales, UTM automático)
           =================================================================== */}
        {activeModule === 'generator' && isAuthenticated && (
          <div className="space-y-6">
            <div className="border-b border-ic-border pb-4 flex items-center justify-between">
              <h1 className="text-2xl font-serif font-bold text-ic-dark">
                Generador de Enlaces
              </h1>
              <span className="text-xs font-mono text-ic-muted">
                Periodo Activo Global: <strong className="text-ic-red">{activePeriod}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* FORMULARIO CREADOR */}
              <div className="lg:col-span-5 bg-white border border-ic-border p-6 space-y-5">
                <form onSubmit={handleCreateLink} className="space-y-4">
                  {/* 1. ESCENARIO / CANAL */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-dark mb-1.5">
                      1. Escenario *
                    </label>
                    <select
                      value={genChannel}
                      onChange={(e) => setGenChannel(e.target.value as ChannelKey)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-ic-border bg-white focus:outline-none focus:border-ic-dark"
                    >
                      <option value="link_ads">Link Ads (TikTok, Google Display, PMax, YouTube)</option>
                      <option value="mailing_sms_chattigo">
                        Mailing / SMS / Chattigo (/CRM)
                      </option>
                      <option value="asesor_prospector">Asesor / Prospector</option>
                      <option value="web_institucional">Portal Web Institucional</option>
                    </select>
                  </div>

                  {/* SUB-SELECTOR SEGÚN ESCENARIO */}
                  {genChannel === 'link_ads' && (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1.5">
                        Plataforma de Pauta (utm) *
                      </label>
                      <select
                        value={genLinkAdsUtm}
                        onChange={(e) => setGenLinkAdsUtm(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                      >
                        {LINK_ADS_PLATFORMS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {genChannel === 'mailing_sms_chattigo' && (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1.5">
                        Medio de Envío (utm) *
                      </label>
                      <select
                        value={genCrmOrigin}
                        onChange={(e) => setGenCrmOrigin(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                      >
                        {CRM_ORIGINS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {genChannel === 'asesor_prospector' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
                          Seleccionar Asesor *
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveModule('tools')}
                          className="text-[11px] text-ic-red font-medium hover:underline"
                        >
                          + Crear Asesor
                        </button>
                      </div>
                      <select
                        value={genAdvisorName}
                        onChange={(e) => setGenAdvisorName(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold border border-ic-border bg-white"
                      >
                        {advisors.map((adv) => (
                          <option key={adv.id} value={adv.name}>
                            {adv.name} (+{adv.phone_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {genChannel === 'web_institucional' && (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1.5">
                        URL o Carrera Específica (Opcional)
                      </label>
                      <input
                        type="text"
                        value={genPortalSubsite}
                        onChange={(e) => setGenPortalSubsite(e.target.value)}
                        placeholder="https://icontinental.edu.pe/carrera/diseno-de-modas/"
                        className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                      />
                    </div>
                  )}

                  {/* 2. CAMPAÑA (Seleccionar existente o escribir nueva en MAYÚSCULA_CON_GUION_BAJO) */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-ic-border space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-ic-dark">
                        2. Campaña *
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setGenCampaignMode((m) => (m === 'select' ? 'new' : 'select'))
                        }
                        className="text-[11px] text-ic-red font-semibold hover:underline"
                      >
                        {genCampaignMode === 'select'
                          ? '+ Nueva campaña'
                          : 'Elegir existente'}
                      </button>
                    </div>

                    {genCampaignMode === 'select' ? (
                      <select
                        value={genSelectedCampaign}
                        onChange={(e) => setGenSelectedCampaign(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-ic-border bg-white"
                      >
                        {campaigns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        <input
                          type="text"
                          required
                          maxLength={30}
                          value={genNewCampaignInput}
                          onChange={(e) =>
                            setGenNewCampaignInput(sanitizeCampaignInput(e.target.value))
                          }
                          placeholder="EJ: NURTURING_CHATTIGO"
                          className="w-full px-3 py-2 text-xs font-mono font-bold border border-ic-border bg-white focus:outline-none focus:border-ic-red"
                        />
                        <div className="text-[10px] text-ic-muted mt-1 flex justify-between">
                          <span>Solo MAYÚSCULAS y _ (espacio = _)</span>
                          <span className="font-mono">{genNewCampaignInput.length}/30</span>
                        </div>
                      </div>
                    )}

                    {/* 3. PERIODO */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-ic-dark">
                          3. Periodo *
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveModule('tools')}
                          className="text-[11px] text-ic-red hover:underline"
                        >
                          Gestionar periodos
                        </button>
                      </div>
                      <select
                        value={genPeriod}
                        onChange={(e) => setGenPeriod(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-ic-border bg-white"
                      >
                        {periods.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.code} {p.is_active ? '(Activo Global)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Número de WhatsApp (Para canales distintos de Asesor) */}
                  {genChannel !== 'asesor_prospector' && (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                        Número de WhatsApp Destino
                      </label>
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
                  )}

                  {/* Vista previa del Mensaje Pre-rellenado con Código de Atención */}
                  <div className="p-3 bg-[#FAFAFA] border border-ic-border space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                      <span>Mensaje Automático WhatsApp</span>
                      <span className="text-ic-red font-mono">
                        {effectiveCampaign}_{genPeriod}
                      </span>
                    </div>
                    <div className="text-xs text-ic-dark font-mono bg-white p-2.5 border border-ic-border leading-relaxed">
                      {effectiveWaMessage}
                    </div>
                  </div>

                  {/* ENLACE FINAL GENERADO POR EL SISTEMA */}
                  <div className="p-3.5 bg-[#FAFAFA] border-l-2 border-l-ic-red border border-ic-border space-y-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-ic-dark">
                      Enlace Final Generado (utm=):
                    </div>
                    <div className="p-2.5 bg-white border border-ic-border font-mono text-[11px] text-ic-dark break-all select-all">
                      {generatedSystemUrl}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedSystemUrl, 'gen-preview')}
                        className="px-3 py-1.5 bg-ic-dark text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        {copiedKey === 'gen-preview' ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Enlace
                          </>
                        )}
                      </button>

                      <label className="flex items-center gap-1.5 text-xs text-ic-dark cursor-pointer">
                        <input
                          type="checkbox"
                          checked={genIsPurgeable}
                          onChange={(e) => setGenIsPurgeable(e.target.checked)}
                          className="accent-ic-red"
                        />
                        <FlaskConical className="w-3.5 h-3.5 text-ic-red" />
                        <span>Es prueba (depurable)</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Guardar y Copiar Enlace
                  </button>

                  {genFeedbackUrl && (
                    <div className="p-2.5 bg-green-50 border border-green-200 text-xs text-green-900 font-mono truncate">
                      Guardado: {genFeedbackUrl}
                    </div>
                  )}
                </form>
              </div>

              {/* LISTA DE ENLACES GENERADOS */}
              <div className="lg:col-span-7 bg-white border border-ic-border">
                <div className="p-4 border-b border-ic-border flex items-center justify-between gap-3">
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    Enlaces Activos ({links.length})
                  </h2>

                  <div className="relative w-60">
                    <Search className="w-3.5 h-3.5 text-ic-muted absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      placeholder="Buscar campaña, periodo, utm..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-ic-border focus:outline-none"
                    />
                  </div>
                </div>

                <div className="divide-y divide-ic-border">
                  {links
                    .filter(
                      (l) =>
                        l.campaign.toLowerCase().includes(linkSearch.toLowerCase()) ||
                        l.period.toLowerCase().includes(linkSearch.toLowerCase()) ||
                        l.subcampaign.toLowerCase().includes(linkSearch.toLowerCase())
                    )
                    .map((link) => (
                      <div
                        key={link.id}
                        className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-gray-100 text-ic-dark">
                              {CHANNEL_LABELS[link.channel]}
                            </span>
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-ic-redSoft text-ic-red">
                              {link.campaign}_{link.period}
                            </span>
                            <span className="text-xs font-mono text-ic-slate">
                              utm={link.subcampaign}
                            </span>
                            {link.is_purgeable && (
                              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                                DEPURABLE
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-xs text-ic-dark break-all">
                            {link.normal_url}
                          </div>

                          {link.whatsapp_message && (
                            <div className="text-[11px] text-ic-muted truncate">
                              {link.whatsapp_message}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => copyToClipboard(link.normal_url, `link-${link.id}`)}
                            className="px-3 py-1.5 bg-ic-dark hover:bg-black text-white text-xs font-medium flex items-center gap-1"
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
                              setQrSelectedUrl(link.normal_url);
                              setActiveModule('tools');
                            }}
                            className="p-1.5 border border-ic-border bg-white hover:text-ic-red"
                            title="Código QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {!link.is_master_route && (
                            <button
                              onClick={() =>
                                setConfirmDelete({
                                  title: '¿Seguro que quieres eliminar este enlace?',
                                  description: `Se eliminará el enlace ${link.campaign}_${link.period} (${link.subcampaign}).`,
                                  onConfirm: async () => {
                                    await DataEngine.deleteLink(link.id);
                                    refreshLocalState();
                                  },
                                })
                              }
                              className="p-1.5 border border-ic-border bg-white text-ic-muted hover:text-ic-red"
                              title="Eliminar enlace"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MÓDULO CONFIGURACIÓN Y HERRAMIENTAS (Periodos, Asesores, WhatsApp, QR)
           =================================================================== */}
        {activeModule === 'tools' && (
          <div className="space-y-8">
            <div className="border-b border-ic-border pb-4 flex items-center justify-between">
              <h1 className="text-2xl font-serif font-bold text-ic-dark">
                Configuración de Periodos, Asesores y WhatsApp
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* 1. GESTOR DE PERIODOS (ESTADO GLOBAL) */}
              <section className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-ic-border pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-ic-red" />
                    <h2 className="text-base font-serif font-bold text-ic-dark">
                      1. Periodos (Estado Global)
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-ic-red font-bold">
                    Activo: {activePeriod}
                  </span>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setPeriodError(null);
                    if (!isValidPeriodCode(newPeriodInput)) {
                      setPeriodError('Usa el formato Año + 10, 20 o 30 (ej: 202610, 202720).');
                      return;
                    }
                    try {
                      await DataEngine.createPeriod(newPeriodInput, true);
                      setNewPeriodInput('');
                      refreshLocalState();
                    } catch (err: unknown) {
                      setPeriodError(err instanceof Error ? err.message : 'Error');
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    maxLength={6}
                    value={newPeriodInput}
                    onChange={(e) => setNewPeriodInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 202610 o 202720"
                    className="flex-1 px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-ic-red text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    Crear Periodo
                  </button>
                </form>

                {periodError && (
                  <div className="text-xs text-red-700 bg-red-50 p-2 border border-red-200">
                    {periodError}
                  </div>
                )}

                <div className="border border-ic-border divide-y divide-ic-border">
                  {periods.map((p) => (
                    <div
                      key={p.code}
                      className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-ic-dark">
                          {p.code}
                        </span>
                        {p.is_active && (
                          <span className="px-2 py-0.5 bg-ic-red text-white text-[10px] font-semibold uppercase">
                            Activo Global
                          </span>
                        )}
                        <span className="text-[11px] text-ic-muted">
                          ({p.usage_count} usos)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!p.is_active && (
                          <button
                            type="button"
                            onClick={async () => {
                              await DataEngine.activatePeriod(p.code);
                              refreshLocalState();
                            }}
                            className="px-2.5 py-1 border border-ic-border bg-white hover:bg-gray-100 text-[11px] font-medium"
                          >
                            Activar
                          </button>
                        )}

                        {p.usage_count === 0 && !p.is_active ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                title: `¿Seguro que quieres eliminar el periodo ${p.code}?`,
                                description:
                                  'Este periodo no tiene enlaces ni conteos asociados.',
                                onConfirm: async () => {
                                  await DataEngine.deletePeriod(p.code);
                                  refreshLocalState();
                                },
                              })
                            }
                            className="p-1 text-ic-muted hover:text-ic-red"
                            title="Eliminar periodo sin uso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="text-[10px] font-mono text-ic-muted px-1.5"
                            title="En uso: limpia sus enlaces o métricas para poder eliminarlo"
                          >
                            En uso
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2. CONSTRUCTOR DE ASESOR / PROSPECTOR */}
              <section className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <UserCheck className="w-4 h-4 text-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    2. Asesores / Prospectores
                  </h2>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!advisorNameInput.trim() || !advisorPhoneInput.trim()) return;
                    await DataEngine.saveAdvisor({
                      id: editingAdvisorId || undefined,
                      name: advisorNameInput,
                      phone_number: advisorPhoneInput,
                    });
                    setEditingAdvisorId(null);
                    setAdvisorNameInput('');
                    setAdvisorPhoneInput('');
                    refreshLocalState();
                  }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <input
                    type="text"
                    required
                    value={advisorNameInput}
                    onChange={(e) => setAdvisorNameInput(e.target.value)}
                    placeholder="Nombre (Ej: Gerber)"
                    className="px-3 py-2 text-xs border border-ic-border bg-white"
                  />
                  <input
                    type="text"
                    required
                    value={advisorPhoneInput}
                    onChange={(e) => setAdvisorPhoneInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Teléfono (519...)"
                    className="px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-ic-red text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    {editingAdvisorId ? 'Actualizar' : 'Agregar Asesor'}
                  </button>
                </form>

                <div className="border border-ic-border divide-y divide-ic-border">
                  {advisors.map((adv) => (
                    <div
                      key={adv.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-semibold text-ic-dark">
                          {adv.name}{' '}
                          <span className="font-mono text-ic-red">+{adv.phone_number}</span>
                        </div>
                        <div className="text-[11px] text-ic-muted truncate max-w-md">
                          "Hola, {adv.name}, quisiera saber más sobre Instituto y Escuela Superior Continental. Código de atención [Campaña]_{activePeriod}"
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAdvisorId(adv.id);
                            setAdvisorNameInput(adv.name);
                            setAdvisorPhoneInput(adv.phone_number);
                          }}
                          className="p-1 text-ic-muted hover:text-ic-dark"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({
                              title: `¿Seguro que quieres eliminar al asesor ${adv.name}?`,
                              description: 'Esta acción quitará al asesor de la lista.',
                              onConfirm: async () => {
                                await DataEngine.deleteAdvisor(adv.id);
                                refreshLocalState();
                              },
                            })
                          }
                          className="p-1 text-ic-muted hover:text-ic-red"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* 3. NÚMEROS DE WHATSAPP INSTITUCIONALES */}
            <section className="bg-white border border-ic-border p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                <Phone className="w-4 h-4 text-ic-red" />
                <h2 className="text-base font-serif font-bold text-ic-dark">
                  3. Números de WhatsApp Institucionales
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 border border-ic-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-ic-border bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                        <th className="py-2.5 px-4">Canal / Etiqueta</th>
                        <th className="py-2.5 px-4">Área</th>
                        <th className="py-2.5 px-4">Teléfono</th>
                        <th className="py-2.5 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ic-border text-xs">
                      {waNumbers.map((w) => (
                        <tr key={w.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-4 font-semibold text-ic-dark">{w.label}</td>
                          <td className="py-2.5 px-4 text-ic-muted">{w.department}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-ic-red">
                            +{w.phone_number}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingWaId(w.id);
                                  setWaLabelInput(w.label);
                                  setWaPhoneInput(w.phone_number);
                                  setWaDeptInput(w.department);
                                }}
                                className="p-1 text-ic-muted hover:text-ic-dark"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {waNumbers.length > 1 && (
                                <button
                                  onClick={() =>
                                    setConfirmDelete({
                                      title: '¿Seguro que quieres eliminar este número de WhatsApp?',
                                      description: `Se eliminará "${w.label}" (+${w.phone_number}) de forma permanente.`,
                                      onConfirm: async () => {
                                        await DataEngine.deleteWhatsAppNumber(w.id);
                                        refreshLocalState();
                                      },
                                    })
                                  }
                                  className="p-1 text-ic-muted hover:text-ic-red"
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
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!waLabelInput.trim() || !waPhoneInput.trim()) return;
                    await DataEngine.saveWhatsAppNumber({
                      id: editingWaId || undefined,
                      label: waLabelInput,
                      phone_number: waPhoneInput,
                      department: waDeptInput,
                      default_greeting:
                        'Hola, quisiera saber más sobre Instituto y Escuela Superior Continental.',
                    });
                    setEditingWaId(null);
                    setWaLabelInput('');
                    setWaPhoneInput('');
                    refreshLocalState();
                  }}
                  className="lg:col-span-5 bg-[#FAFAFA] border border-ic-border p-4 space-y-3"
                >
                  <div className="text-xs font-serif font-bold text-ic-dark">
                    {editingWaId ? 'Editar Número' : 'Nuevo Número de WhatsApp'}
                  </div>
                  <input
                    type="text"
                    required
                    value={waLabelInput}
                    onChange={(e) => setWaLabelInput(e.target.value)}
                    placeholder="Etiqueta (Ej: WhatsApp Admisión)"
                    className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={waPhoneInput}
                      onChange={(e) => setWaPhoneInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="51987654321"
                      className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                    />
                    <input
                      type="text"
                      value={waDeptInput}
                      onChange={(e) => setWaDeptInput(e.target.value)}
                      placeholder="Área"
                      className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-ic-red text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    {editingWaId ? 'Actualizar' : 'Guardar Número'}
                  </button>
                </form>
              </div>
            </section>

            {/* 4. QR Y SIMULADOR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <QrCode className="w-4 h-4 text-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    4. Código QR
                  </h2>
                </div>

                <select
                  value={qrSelectedUrl}
                  onChange={(e) => setQrSelectedUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                >
                  {links.map((l) => (
                    <option key={l.id} value={l.normal_url}>
                      {l.campaign}_{l.period} ({l.subcampaign})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-6 p-4 bg-[#FAFAFA] border border-ic-border">
                  <div className="bg-white p-2 border border-ic-border">
                    {qrPngUrl && (
                      <img src={qrPngUrl} alt="QR" className="w-28 h-28 object-contain" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setQrColor('#111827')}
                        className="px-2.5 py-1 text-xs border border-ic-border bg-white"
                      >
                        Negro
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrColor('#E4000B')}
                        className="px-2.5 py-1 text-xs border border-ic-red text-ic-red bg-white"
                      >
                        Rojo IC
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
                      className="w-full py-2 bg-ic-red text-white text-xs font-medium"
                    >
                      Descargar SVG
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <ShieldCheck className="w-4 h-4 text-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    5. Simulador y Depurador de Pruebas
                  </h2>
                </div>

                <select
                  value={simRecordId}
                  onChange={(e) => setSimRecordId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                >
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.campaign}_{r.period}] {r.subcampaign}
                    </option>
                  ))}
                </select>

                <select
                  value={simIsBot ? 'bot' : 'human'}
                  onChange={(e) => setSimIsBot(e.target.value === 'bot')}
                  className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                >
                  <option value="human">Clic de Prueba (Humano)</option>
                  <option value="bot">Vista Previa de Bot (Bloqueado)</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await DataEngine.simulateTestClick({
                        recordId: simRecordId,
                        isBot: simIsBot,
                      });
                      setSimFeedback(res.message);
                      refreshLocalState();
                    }}
                    className="py-2 bg-ic-dark text-white text-xs font-semibold uppercase flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Simular
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurgeFeedback(null);
                      setIsPurgeModalOpen(true);
                    }}
                    className="py-2 border border-ic-red text-ic-red text-xs font-semibold uppercase flex items-center justify-center gap-1.5"
                  >
                    <FilterX className="w-3.5 h-3.5" /> Depurar
                  </button>
                </div>

                {simFeedback && (
                  <div className="p-2.5 bg-gray-50 border border-ic-border text-xs">
                    {simFeedback}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
