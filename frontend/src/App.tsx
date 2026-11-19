import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  FilterX,
  FlaskConical,
  GitBranch,
  Link2,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Phone,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Trophy,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AdvisorItem,
  buildAttentionCode,
  buildDefaultWhatsAppMessage,
  CareerItem,
  CHANNEL_LABELS,
  ChannelKey,
  isValidPeriodCode,
  LinkItem,
  PeriodItem,
  sanitizeCampaignInput,
  SubcampaignRecord,
  SubchannelItem,
  WhatsAppNumberItem,
} from './types/trace';
import { DataEngine } from './services/dataEngine';
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

const LOGO_IC_NEGRO =
  'https://icontinental.edu.pe/wp-content/uploads/2025/11/logo-ic-negro.svg';
const AUTH_STORAGE_KEY = 'trace_ic_auth_session_v4';

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

/**
 * Celda de numeración (#) con icono SVG de Copa para el 1er puesto
 */
const RankCell: React.FC<{ index: number }> = ({ index }) => {
  const num = String(index + 1).padStart(2, '0');
  return (
    <td className="py-2.5 pl-5 pr-2 w-14 font-mono text-[11px] tabular-nums">
      <div className="inline-flex items-center gap-1.5">
        {index === 0 ? (
          <Trophy className="w-3.5 h-3.5 text-ic-red flex-shrink-0" />
        ) : (
          <span className="w-3.5 inline-block" />
        )}
        <span className={index === 0 ? 'font-bold text-ic-red' : 'text-ic-muted'}>
          {num}
        </span>
      </div>
    </td>
  );
};

/**
 * Gráfico de Barras Minimalista Sencillo
 */
const MinimalBarChart: React.FC<{
  title: string;
  items: { label: string; sublabel?: string; clicks: number; unique: number }[];
}> = ({ title, items }) => {
  const maxClicks = Math.max(1, ...items.map((i) => i.clicks));
  if (items.length === 0) return null;

  return (
    <div className="p-5 bg-[#FAFAFA] border-t border-ic-border space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
        {title}
      </div>
      <div className="space-y-2.5">
        {items.map((item) => {
          const widthPct = Math.max(2, Math.round((item.clicks / maxClicks) * 100));
          return (
            <div
              key={`${item.label}-${item.sublabel || ''}`}
              className="grid grid-cols-12 items-center gap-3 text-xs"
            >
              <div className="col-span-4 sm:col-span-3 truncate font-semibold text-ic-dark">
                {item.label}
                {item.sublabel && (
                  <span className="ml-1.5 text-[10px] font-mono font-normal text-ic-muted">
                    ({item.sublabel})
                  </span>
                )}
              </div>
              <div className="col-span-6 sm:col-span-7 bg-gray-200/80 h-2.5 overflow-hidden">
                <div
                  className="h-full bg-ic-red transition-all duration-300"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="col-span-2 text-right font-mono font-bold text-ic-dark tabular-nums">
                {item.clicks.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const [activeModule, setActiveModule] = useState<MainModule>('reports');

  // Estado sincronizado
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [activePeriod, setActivePeriod] = useState<string>('');
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [subchannels, setSubchannels] = useState<SubchannelItem[]>([]);
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
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState<boolean>(false);
  const [tempPreset, setTempPreset] = useState<DatePreset>('this_month');
  const [tempStart, setTempStart] = useState<string>('2026-11-01');
  const [tempEnd, setTempEnd] = useState<string>('2026-11-30');
  const dateDropdownRef = useRef<HTMLDivElement | null>(null);

  // Preselect en el Periodo Activo Global (cuando es 'all' muestra acordeones por periodo)
  const [reportPeriodFilter, setReportPeriodFilter] = useState<string>('all');
  const [hasInitializedPeriodFilter, setHasInitializedPeriodFilter] = useState<boolean>(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [highlightedChannel, setHighlightedChannel] = useState<ChannelKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ===========================================================================
  // MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
  // ===========================================================================
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // ===========================================================================
  // MODAL DE DEPURACIÓN DE CONTEOS Y PRUEBAS
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
  // GENERADOR DE ENLACES (Canal -> Subcanal, Campaña desde Configuración)
  // ===========================================================================
  const [genChannel, setGenChannel] = useState<ChannelKey>('link_ads');
  const [genSubchannel, setGenSubchannel] = useState<string>('');
  const [genAdvisorName, setGenAdvisorName] = useState<string>('');
  const [genSelectedCampaign, setGenSelectedCampaign] = useState<string>('');
  const [genCareer, setGenCareer] = useState<string>('Administración de Empresas');

  const [genWaPhone, setGenWaPhone] = useState<string>('');
  const [genIsPurgeable, setGenIsPurgeable] = useState<boolean>(false);
  const [genFeedbackMessage, setGenFeedbackMessage] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState<string>('');

  // ===========================================================================
  // CONFIGURACIÓN (Canales y Subcanales, Campañas, Periodos, Carreras, Asesores, WhatsApp)
  // ===========================================================================
  const [cfgParentChannel, setCfgParentChannel] = useState<ChannelKey>('link_ads');
  const [newSubchannelInput, setNewSubchannelInput] = useState<string>('');

  const [newCampaignInput, setNewCampaignInput] = useState<string>('');
  const [newPeriodInput, setNewPeriodInput] = useState<string>('');
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [newCareerInput, setNewCareerInput] = useState<string>('');

  const [editingAdvisorId, setEditingAdvisorId] = useState<number | null>(null);
  const [advisorNameInput, setAdvisorNameInput] = useState<string>('');
  const [advisorPhoneInput, setAdvisorPhoneInput] = useState<string>('');

  const [editingWaId, setEditingWaId] = useState<number | null>(null);
  const [waLabelInput, setWaLabelInput] = useState('');
  const [waPhoneInput, setWaPhoneInput] = useState('');
  const [waDeptInput, setWaDeptInput] = useState('Admisión');

  const [qrSelectedUrl, setQrSelectedUrl] = useState<string>('');
  const [qrColor, setQrColor] = useState<'#111827' | '#E4000B'>('#111827');
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [qrSvgText, setQrSvgText] = useState<string>('');

  // Simulador: SOLO permite añadir conteo a los enlaces ya generados (links)
  const [simLinkId, setSimLinkId] = useState<number>(0);
  const [simIsBot, setSimIsBot] = useState<boolean>(false);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  const isTestRecord = (r: SubcampaignRecord) =>
    Boolean(r.is_purgeable) || /prueba|test|demo|simulaci/i.test(r.subcampaign);

  const computeDatesForPreset = (preset: DatePreset): { start: string; end: string } => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const todayStr = fmt(now);

    if (preset === 'today') return { start: todayStr, end: todayStr };
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
    const loadedCareers = DataEngine.getCareers();
    const loadedSubchannels = DataEngine.getSubchannels();
    const loadedAdvisors = DataEngine.getAdvisors();
    const loadedLinks = DataEngine.getLinks();
    const loadedRecords = DataEngine.getRecords();
    const loadedWa = DataEngine.getWhatsAppNumbers();

    setPeriods(loadedPeriods);
    setActivePeriod(currentActivePeriod);
    if (!hasInitializedPeriodFilter) {
      setReportPeriodFilter(currentActivePeriod || 'all');
      if (currentActivePeriod) {
        setHasInitializedPeriodFilter(true);
      }
    }
    setCampaigns(loadedCampaigns);
    setCareers(loadedCareers);
    setSubchannels(loadedSubchannels);
    setAdvisors(loadedAdvisors);
    setLinks(loadedLinks);
    setRecords(loadedRecords);
    setWaNumbers(loadedWa);

    if (loadedCampaigns.length > 0 && !loadedCampaigns.includes(genSelectedCampaign)) {
      setGenSelectedCampaign(loadedCampaigns[0]);
    } else if (loadedCampaigns.length === 0) {
      setGenSelectedCampaign('');
    }
    if (loadedCareers.length > 0 && !loadedCareers.some((c) => c.name === genCareer)) {
      setGenCareer(loadedCareers[0].name);
    }
    if (loadedAdvisors.length > 0 && !loadedAdvisors.some((a) => a.name === genAdvisorName)) {
      setGenAdvisorName(loadedAdvisors[0].name);
    } else if (loadedAdvisors.length === 0) {
      setGenAdvisorName('');
    }
    if (loadedWa.length > 0 && !loadedWa.some((w) => w.phone_number === genWaPhone)) {
      setGenWaPhone(loadedWa[0].phone_number);
    } else if (loadedWa.length === 0) {
      setGenWaPhone('');
    }
    if (loadedLinks.length > 0) {
      if (!loadedLinks.some((l) => l.short_url === qrSelectedUrl)) {
        setQrSelectedUrl(loadedLinks[0].short_url);
      }
      if (!loadedLinks.some((l) => l.id === simLinkId)) {
        setSimLinkId(loadedLinks[0].id);
      }
    } else {
      setQrSelectedUrl('');
      setSimLinkId(0);
    }
    if (loadedRecords.length > 0 && !loadedRecords.some((r) => r.id === purgeTargetId)) {
      const firstTest = loadedRecords.find((r) => isTestRecord(r));
      setPurgeTargetId(firstTest ? firstTest.id : loadedRecords[0].id);
    }
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

  // Sincronizar subcanal seleccionado cuando cambia el Canal en el Generador
  const availableSubchannelsForGen = useMemo(() => {
    return subchannels.filter((s) => s.channel === genChannel);
  }, [subchannels, genChannel]);

  useEffect(() => {
    if (genChannel !== 'asesor_prospector') {
      if (availableSubchannelsForGen.length === 0) {
        setGenSubchannel('');
      } else if (!availableSubchannelsForGen.some((s) => s.name === genSubchannel)) {
        setGenSubchannel(availableSubchannelsForGen[0].name);
      }
    }
  }, [genChannel, availableSubchannelsForGen, genSubchannel]);

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
    const target = qrSelectedUrl || 'https://trace.icontinental.edu.pe/organico';
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
    setLoginEmail('');
    setLoginPassword('');
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const scrollToChannelSection = (ch: ChannelKey) => {
    setHighlightedChannel(ch);
    const el = document.getElementById(`desglose-canal-${ch}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  };

  // ===========================================================================
  // CÁLCULO EN VIVO DEL MENSAJE PRE-GENERADO EN EL GENERADOR DE ENLACES
  // ===========================================================================
  const effectiveSubchannel = useMemo(() => {
    if (genChannel === 'asesor_prospector') return genAdvisorName || '[SUBCANAL]';
    return genSubchannel || '[SUBCANAL]';
  }, [genChannel, genSubchannel, genAdvisorName]);

  const effectivePhone = useMemo(() => {
    if (genChannel === 'asesor_prospector') {
      const adv = advisors.find((a) => a.name === genAdvisorName);
      return adv ? adv.phone_number : genWaPhone;
    }
    return genWaPhone;
  }, [genChannel, genAdvisorName, advisors, genWaPhone]);

  // Sí renderiza el mensaje final en vivo en el Generador
  const renderedFinalWhatsAppMessage = useMemo(() => {
    return buildDefaultWhatsAppMessage({
      channel: genChannel,
      campaign: genSelectedCampaign,
      career: genCareer,
      period: activePeriod,
      subchannel: effectiveSubchannel,
      advisorName: genAdvisorName,
    });
  }, [genChannel, genSelectedCampaign, genCareer, activePeriod, effectiveSubchannel, genAdvisorName]);

  // ===========================================================================
  // AGREGACIONES PARA LAS 6 SECCIONES DE REPORTERÍA
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

  const distinctPeriodsInFilter = useMemo(() => {
    const set = new Set<string>();
    filteredRecords.forEach((r) => set.add(r.period));
    if (set.size === 0 && reportPeriodFilter !== 'all') {
      set.add(reportPeriodFilter);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [filteredRecords, reportPeriodFilter]);

  // 1. Conteo General por Canal
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
    const chartItems = (Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((ch) => ({
      label: CHANNEL_LABELS[ch],
      clicks: map[ch].clicks,
      unique: map[ch].unique,
    }));
    return { byChannel: map, grandTotalClicks, grandTotalUnique, chartItems };
  }, [filteredRecords]);

  // 2. Desglose por Canal (Asesor/Prospector se ordena por Asesor; los demás por Campaña/Clics)
  const breakdownByChannel = useMemo(() => {
    const channelsOrder: ChannelKey[] = [
      'web_institucional',
      'link_ads',
      'mailing_sms_chattigo',
      'asesor_prospector',
    ];
    return channelsOrder.map((ch) => {
      const rows = filteredRecords
        .filter((r) => r.channel === ch)
        .sort((a, b) => {
          if (ch === 'asesor_prospector') {
            const cmp = (a.advisor_name || a.subcampaign).localeCompare(
              b.advisor_name || b.subcampaign
            );
            if (cmp !== 0) return cmp;
          }
          return b.clicks - a.clicks;
        });
      const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
      const totalUnique = rows.reduce((s, r) => s + r.unique_visitors, 0);
      return {
        channel: ch,
        channelLabel: CHANNEL_LABELS[ch],
        totalClicks,
        totalUnique,
        rows,
      };
    });
  }, [filteredRecords]);

  // 3. Resultados por Carrera (Puesto #3, Columna mandatoria: Carrera)
  const buildCareersRanking = (sourceRows: SubcampaignRecord[]) => {
    const map = new Map<
      string,
      {
        key: string;
        career: string;
        campaign: string;
        channelLabel: string;
        subchannelLabel: string;
        period: string;
        code: string;
        clicks: number;
        unique: number;
      }
    >();

    sourceRows.forEach((r) => {
      const key = `${r.career}::${r.period}`;
      const code = buildAttentionCode({
        channel: r.channel,
        subchannel: r.subcampaign,
        campaign: r.campaign,
        career: r.career,
        period: r.period,
      });
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          career: r.career,
          campaign: r.campaign,
          channelLabel: CHANNEL_LABELS[r.channel],
          subchannelLabel: r.subcampaign,
          period: r.period,
          code,
          clicks: r.clicks,
          unique: r.unique_visitors,
        });
      } else {
        existing.clicks += r.clicks;
        existing.unique += r.unique_visitors;
        if (!existing.channelLabel.includes(CHANNEL_LABELS[r.channel])) {
          existing.channelLabel += `, ${CHANNEL_LABELS[r.channel]}`;
        }
        if (!existing.subchannelLabel.includes(r.subcampaign)) {
          existing.subchannelLabel += `, ${r.subcampaign}`;
        }
        if (!existing.campaign.includes(r.campaign)) {
          existing.campaign += `, ${r.campaign}`;
        }
        if (!existing.code.includes(code)) {
          existing.code += `, ${code}`;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks);
  };

  const resultsByCareer = useMemo(
    () => buildCareersRanking(filteredRecords),
    [filteredRecords]
  );

  // 4. Subcanales más exitosos (Puesto #4, Columna mandatoria: Subcanal, Canal a la derecha, sin Campaña ni Carrera, no cuenta Asesores)
  const buildSubchannelsRanking = (sourceRows: SubcampaignRecord[]) => {
    const map = new Map<
      string,
      {
        key: string;
        subchannel: string;
        channelLabel: string;
        period: string;
        code: string;
        clicks: number;
        unique: number;
      }
    >();

    sourceRows
      .filter((r) => r.channel !== 'asesor_prospector')
      .forEach((r) => {
        const key = `${r.subcampaign}::${r.channel}::${r.period}`;
        const code = buildAttentionCode({
          channel: r.channel,
          subchannel: r.subcampaign,
          campaign: r.campaign,
          career: r.career,
          period: r.period,
        });
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            key,
            subchannel: r.subcampaign,
            channelLabel: CHANNEL_LABELS[r.channel],
            period: r.period,
            code,
            clicks: r.clicks,
            unique: r.unique_visitors,
          });
        } else {
          existing.clicks += r.clicks;
          existing.unique += r.unique_visitors;
          if (!existing.code.includes(code)) {
            existing.code += `, ${code}`;
          }
        }
      });

    return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks);
  };

  const resultsBySubchannel = useMemo(
    () => buildSubchannelsRanking(filteredRecords),
    [filteredRecords]
  );

  // 5. Resultado por Número de WhatsApp
  const buildWhatsAppRanking = (sourceRows: SubcampaignRecord[]) => {
    const map = new Map<
      string,
      {
        phone: string;
        label: string;
        clicks: number;
        unique: number;
      }
    >();

    sourceRows.forEach((r) => {
      const phone = r.whatsapp_phone || '51987654321';
      const foundWa = waNumbers.find((w) => w.phone_number === phone);
      const foundAdv = advisors.find((a) => a.phone_number === phone);
      const label = foundWa
        ? foundWa.label
        : foundAdv
        ? `Asesor ${foundAdv.name}`
        : 'WhatsApp Institucional';

      const existing = map.get(phone) || {
        phone,
        label,
        clicks: 0,
        unique: 0,
      };
      existing.clicks += r.clicks;
      existing.unique += r.unique_visitors;
      map.set(phone, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks);
  };

  const resultsByWhatsApp = useMemo(
    () => buildWhatsAppRanking(filteredRecords),
    [filteredRecords, waNumbers, advisors]
  );

  // 6. Resultado por Periodo
  const resultsByPeriod = useMemo(() => {
    const map = new Map<
      string,
      {
        period: string;
        isActive: boolean;
        clicks: number;
        unique: number;
      }
    >();

    periods.forEach((p) => {
      map.set(p.code, {
        period: p.code,
        isActive: p.is_active,
        clicks: 0,
        unique: 0,
      });
    });

    records
      .filter((r) => r.last_activity_date >= startDate && r.last_activity_date <= endDate)
      .forEach((r) => {
        const existing = map.get(r.period) || {
          period: r.period,
          isActive: r.period === activePeriod,
          clicks: 0,
          unique: 0,
        };
        existing.clicks += r.clicks;
        existing.unique += r.unique_visitors;
        map.set(r.period, existing);
      });

    return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks);
  }, [records, startDate, endDate, periods, activePeriod]);

  const handleExportReportCsv = () => {
    const headers = [
      'Campana',
      'Canal',
      'Subcanal',
      'Carrera',
      'Periodo',
      'Codigo',
      'Telefono_WhatsApp',
      'Clics_Totales',
      'Personas_Unicas',
      'Fecha_Actividad',
    ];
    const rows = filteredRecords.map((r) => [
      `"${r.campaign}"`,
      `"${CHANNEL_LABELS[r.channel]}"`,
      `"${r.subcampaign.replace(/"/g, '""')}"`,
      `"${r.career.replace(/"/g, '""')}"`,
      `"${r.period}"`,
      `"${buildAttentionCode({
        channel: r.channel,
        subchannel: r.subcampaign,
        campaign: r.campaign,
        career: r.career,
        period: r.period,
      })}"`,
      `"${r.whatsapp_phone}"`,
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

  // Array compartido de opciones de enlaces generados para 7. Código QR y 8. Simulador de Pruebas
  const generatedLinkOptions = useMemo(
    () =>
      links.map((l) => ({
        id: l.id,
        short_url: l.short_url,
        label: `[${l.short_code}] ${CHANNEL_LABELS[l.channel]} (${l.subcampaign}) — ${l.career}`,
      })),
    [links]
  );

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenFeedbackMessage(null);

    if (!activePeriod) {
      alert('Primero crea y activa un Periodo en Configuración.');
      return;
    }
    if (genChannel === 'asesor_prospector' && !genAdvisorName) {
      alert('Primero crea un Asesor en Configuración.');
      return;
    }
    if (genChannel !== 'asesor_prospector' && !genSubchannel) {
      alert('Primero crea un Subcanal para este canal en Configuración.');
      return;
    }
    if (!genSelectedCampaign) {
      alert('Primero crea una Campaña en Configuración.');
      return;
    }
    if (!genCareer) {
      alert('Selecciona una Carrera.');
      return;
    }
    if (!effectivePhone) {
      alert('Primero registra un Número de WhatsApp en Configuración.');
      return;
    }

    try {
      await DataEngine.createLink({
        channel: genChannel,
        period: activePeriod,
        campaign: genSelectedCampaign,
        career: genCareer,
        subcampaign: effectiveSubchannel,
        advisor_name: genChannel === 'asesor_prospector' ? genAdvisorName : undefined,
        whatsapp_phone: effectivePhone,
        whatsapp_message: renderedFinalWhatsAppMessage,
        is_purgeable: genIsPurgeable,
      });

      setGenFeedbackMessage('Enlace guardado. Cópialo desde la lista de Enlaces Activos.');
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
  // LOGIN PROTEGIENDO TODA LA APP
  // ===========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex bg-white text-ic-dark">
        {/* MITAD IZQUIERDA (50%): Solo imagen limpia sin logo */}
        <div className="hidden lg:block lg:w-1/2 relative bg-[#0B0F17] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=85"
            alt="Instituto Continental"
            className="absolute inset-0 w-full h-full object-cover opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17]/80 via-transparent to-[#0B0F17]/30" />
          <div className="absolute top-0 left-0 w-2 h-full bg-ic-red" />
        </div>

        {/* MITAD DERECHA (50%): Login Centrado sin footer */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-14 bg-white">
          <div className="w-full max-w-sm space-y-6">
            <a href="/app/" className="inline-block">
              <img
                src={LOGO_IC_NEGRO}
                alt="Instituto Continental"
                className="h-8 w-auto"
              />
            </a>

            <div className="space-y-1">
              <div className="w-8 h-1 bg-ic-red mb-3" />
              <h1 className="text-3xl font-serif font-bold text-ic-dark">
                Iniciar Sesión
              </h1>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border-l-2 border-l-ic-red text-xs text-red-900">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-dark mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ic-muted absolute left-3.5 top-2.5" />
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Correo institucional"
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
                    autoComplete="new-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Contraseña"
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-ic-dark flex flex-col">
      {/* =====================================================================
          CABECERA SUPERIOR CON LOGO OFICIAL (href a inicio)
         ===================================================================== */}
      <header className="bg-white border-b border-ic-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8 h-full">
            <a
              href="/app/"
              onClick={(e) => {
                e.preventDefault();
                setActiveModule('reports');
              }}
              className="flex items-center gap-3"
              title="Ir a Inicio"
            >
              <img
                src={LOGO_IC_NEGRO}
                alt="Instituto Continental"
                className="h-7 w-auto"
              />
            </a>

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

            <button
              onClick={handleLogout}
              className="p-2 text-ic-muted hover:text-ic-red border border-ic-border bg-white"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
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
          MODAL DE DEPURACIÓN DE CONTEOS Y PRUEBAS
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
                            [{r.campaign}] {r.career} ({r.subcampaign} — {r.clicks} clics)
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-10">
        {/* ===================================================================
            MÓDULO 01: REPORTERÍA
           =================================================================== */}
        {activeModule === 'reports' && (
          <>
            {/* Barra Superior: Título + Filtro de Fecha en 1 solo botón + Periodo */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-ic-border pb-5">
              <h1 className="text-2xl font-serif font-bold text-ic-dark">
                Reportería
              </h1>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1 SOLO BOTÓN DE FILTRO DE FECHA CON DROPDOWN */}
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

                      <div className="flex-1 p-5 flex flex-col justify-between space-y-5">
                        <div className="space-y-4">
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
                    {periods.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} {p.is_active ? '(Activo)' : ''}
                      </option>
                    ))}
                    <option value="all">Todos (Agrupar por Periodo)</option>
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

            {/* ===============================================================
                1. CONTEO GENERAL POR CANAL
               =============================================================== */}
            <section className="bg-white border border-ic-border">
              <div className="px-6 py-4 border-b border-ic-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    1. Conteo General por Canal
                  </h2>
                </div>
                <span className="text-[11px] text-ic-muted">
                  Haz clic en un canal para ir a su desglose
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-ic-border">
                <div className="p-5 bg-[#FAFAFA]/60">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
                    Total General
                  </div>
                  <div className="mt-2 text-3xl font-serif font-bold text-ic-dark tabular-nums">
                    {channelTotals.grandTotalClicks.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-ic-muted tabular-nums">
                    {channelTotals.grandTotalUnique.toLocaleString()} únicos
                  </div>
                </div>

                {(Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((ch) => {
                  const stat = channelTotals.byChannel[ch];
                  const pct = Math.round(
                    (stat.clicks / Math.max(1, channelTotals.grandTotalClicks)) * 100
                  );
                  const isActive = highlightedChannel === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => scrollToChannelSection(ch)}
                      className={`p-5 text-left transition-colors relative ${
                        isActive ? 'bg-ic-redSoft/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      {isActive && (
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

              <MinimalBarChart
                title="Comparativa Visual por Canal"
                items={channelTotals.chartItems}
              />
            </section>

            {/* ===============================================================
                2. DESGLOSE POR CANAL
                - Imprime Subcanal en lugar de Canal
                - Asesor/Prospector se ordena por Asesor
               =============================================================== */}
            <section className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-5 bg-ic-red" />
                <h2 className="text-base font-serif font-bold text-ic-dark">
                  2. Desglose por Canal
                </h2>
              </div>

              {breakdownByChannel.map((block) => {
                const isHighlighted = highlightedChannel === block.channel;
                const isAdvisorChannel = block.channel === 'asesor_prospector';

                const renderChannelTable = (rows: SubcampaignRecord[]) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-ic-border bg-white text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                          <th className="py-2.5 pl-5 pr-2 w-14">#</th>
                          {isAdvisorChannel ? (
                            <>
                              <th className="py-2.5 px-4 text-ic-dark font-bold">
                                Asesor (Subcanal)
                              </th>
                              <th className="py-2.5 px-4">Campaña</th>
                            </>
                          ) : (
                            <>
                              <th className="py-2.5 px-4 text-ic-dark font-bold">Campaña</th>
                              <th className="py-2.5 px-4">Subcanal</th>
                            </>
                          )}
                          <th className="py-2.5 px-4">Carrera</th>
                          <th className="py-2.5 px-4">Periodo</th>
                          <th className="py-2.5 px-4">Código</th>
                          <th className="py-2.5 px-4 text-right">Clics</th>
                          <th className="py-2.5 pr-6 pl-4 text-right w-28">Únicos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-4 px-6 text-ic-muted">
                              Sin registros en el periodo seleccionado.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, idx) => {
                            const code = buildAttentionCode({
                              channel: row.channel,
                              subchannel: row.subcampaign,
                              campaign: row.campaign,
                              career: row.career,
                              period: row.period,
                            });
                            return (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <RankCell index={idx} />
                                {isAdvisorChannel ? (
                                  <>
                                    <td className="py-2.5 px-4 font-bold text-ic-dark">
                                      {row.advisor_name || row.subcampaign}
                                    </td>
                                    <td className="py-2.5 px-4 font-mono text-ic-dark">
                                      {row.campaign}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2.5 px-4 font-mono font-bold text-ic-dark">
                                      {row.campaign}
                                    </td>
                                    <td className="py-2.5 px-4 font-mono text-ic-slate">
                                      {row.subcampaign}
                                    </td>
                                  </>
                                )}
                                <td className="py-2.5 px-4 font-medium text-ic-dark">
                                  {row.career}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-ic-slate">
                                  {row.period}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className="px-2 py-0.5 bg-ic-redSoft text-ic-red font-mono font-bold text-[11px]">
                                    {code}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-ic-dark tabular-nums">
                                  {row.clicks.toLocaleString()}
                                </td>
                                <td className="py-2.5 pr-6 pl-4 text-right text-ic-muted tabular-nums">
                                  {row.unique_visitors.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                );

                return (
                  <div
                    key={block.channel}
                    id={`desglose-canal-${block.channel}`}
                    className={`bg-white border transition-colors scroll-mt-20 ${
                      isHighlighted ? 'border-ic-red ring-1 ring-ic-red' : 'border-ic-border'
                    }`}
                  >
                    <div className="px-6 py-3.5 bg-[#FAFAFA] border-b border-ic-border flex items-center justify-between">
                      <h3 className="text-sm font-serif font-bold text-ic-dark">
                        {block.channelLabel}
                      </h3>
                      <div className="flex items-center gap-4 text-xs tabular-nums">
                        <strong className="text-ic-dark">
                          {block.totalClicks.toLocaleString()} clics
                        </strong>
                        <span className="text-ic-muted">
                          {block.totalUnique.toLocaleString()} únicos
                        </span>
                      </div>
                    </div>

                    {reportPeriodFilter !== 'all' ? (
                      renderChannelTable(block.rows)
                    ) : (
                      <div className="divide-y divide-ic-border">
                        {distinctPeriodsInFilter.map((per) => {
                          const perRows = block.rows.filter((r) => r.period === per);
                          const perClicks = perRows.reduce((s, r) => s + r.clicks, 0);
                          const perUnique = perRows.reduce((s, r) => s + r.unique_visitors, 0);
                          const accKey = `ch-${block.channel}-${per}`;
                          const isOpen = openAccordions[accKey] ?? true;

                          return (
                            <div key={accKey}>
                              <button
                                type="button"
                                onClick={() => toggleAccordion(accKey)}
                                className="w-full px-6 py-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between text-left"
                              >
                                <div className="flex items-center gap-2">
                                  {isOpen ? (
                                    <ChevronDown className="w-4 h-4 text-ic-red" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-ic-muted" />
                                  )}
                                  <span className="text-xs font-semibold uppercase text-ic-muted">
                                    Periodo:
                                  </span>
                                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-ic-border text-ic-red">
                                    {per}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs tabular-nums">
                                  <span className="font-bold text-ic-dark">
                                    {perClicks.toLocaleString()} clics
                                  </span>
                                  <span className="text-ic-muted">
                                    {perUnique.toLocaleString()} únicos
                                  </span>
                                </div>
                              </button>
                              {isOpen && renderChannelTable(perRows)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* ===============================================================
                3. RESULTADOS POR CARRERA (Ahora es el #3)
               =============================================================== */}
            <section className="bg-white border border-ic-border">
              <div className="px-6 py-4 border-b border-ic-border flex items-center gap-3">
                <div className="w-1.5 h-5 bg-ic-red" />
                <h2 className="text-base font-serif font-bold text-ic-dark">
                  3. Resultados por Carrera
                </h2>
              </div>

              {(() => {
                const renderCareersTable = (items: ReturnType<typeof buildCareersRanking>) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-ic-border bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                          <th className="py-2.5 pl-5 pr-2 w-14">#</th>
                          <th className="py-2.5 px-4 text-ic-dark font-bold">Carrera</th>
                          <th className="py-2.5 px-4">Campaña</th>
                          <th className="py-2.5 px-4">Canal</th>
                          <th className="py-2.5 px-4">Subcanal</th>
                          <th className="py-2.5 px-4">Periodo</th>
                          <th className="py-2.5 px-4">Código</th>
                          <th className="py-2.5 px-4 text-right">Clics</th>
                          <th className="py-2.5 pr-6 pl-4 text-right w-28">Únicos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ic-border text-xs">
                        {items.map((item, idx) => (
                          <tr key={item.key} className="hover:bg-gray-50">
                            <RankCell index={idx} />
                            <td className="py-3 px-4 font-bold text-ic-dark">
                              {item.career}
                            </td>
                            <td className="py-3 px-4 font-mono text-ic-dark">
                              {item.campaign}
                            </td>
                            <td className="py-3 px-4 text-ic-slate">{item.channelLabel}</td>
                            <td className="py-3 px-4 font-mono text-ic-slate">
                              {item.subchannelLabel}
                            </td>
                            <td className="py-3 px-4 font-mono text-ic-slate">
                              {item.period}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-ic-redSoft text-ic-red font-mono font-bold text-[11px]">
                                {item.code}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-ic-dark tabular-nums">
                              {item.clicks.toLocaleString()}
                            </td>
                            <td className="py-3 pr-6 pl-4 text-right text-ic-muted tabular-nums">
                              {item.unique.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );

                return reportPeriodFilter !== 'all' ? (
                  renderCareersTable(resultsByCareer)
                ) : (
                  <div className="divide-y divide-ic-border">
                    {distinctPeriodsInFilter.map((per) => {
                      const perItems = buildCareersRanking(
                        filteredRecords.filter((r) => r.period === per)
                      );
                      const perClicks = perItems.reduce((s, i) => s + i.clicks, 0);
                      const perUnique = perItems.reduce((s, i) => s + i.unique, 0);
                      const accKey = `careers-${per}`;
                      const isOpen = openAccordions[accKey] ?? true;

                      return (
                        <div key={accKey}>
                          <button
                            type="button"
                            onClick={() => toggleAccordion(accKey)}
                            className="w-full px-6 py-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-ic-red" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-ic-muted" />
                              )}
                              <span className="text-xs font-semibold uppercase text-ic-muted">
                                Periodo:
                              </span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-ic-border text-ic-red">
                                {per}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs tabular-nums">
                              <span className="font-bold text-ic-dark">
                                {perClicks.toLocaleString()} clics
                              </span>
                              <span className="text-ic-muted">
                                {perUnique.toLocaleString()} únicos
                              </span>
                            </div>
                          </button>
                          {isOpen && renderCareersTable(perItems)}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <MinimalBarChart
                title="Comparativa Visual por Carrera"
                items={resultsByCareer.map((c) => ({
                  label: c.career,
                  sublabel: c.period,
                  clicks: c.clicks,
                  unique: c.unique,
                }))}
              />
            </section>

            {/* ===============================================================
                4. SUBCANALES MÁS EXITOSOS (Ahora es el #4)
                - Columna mandatoria: Subcanal
                - A la derecha: Canal al cual pertenece
                - Sin Campaña ni Carrera
               =============================================================== */}
            <section className="bg-white border border-ic-border">
              <div className="px-6 py-4 border-b border-ic-border flex items-center gap-3">
                <div className="w-1.5 h-5 bg-ic-red" />
                <h2 className="text-base font-serif font-bold text-ic-dark">
                  4. Subcanales más exitosos
                </h2>
              </div>

              {(() => {
                const renderSubchannelsTable = (
                  items: ReturnType<typeof buildSubchannelsRanking>
                ) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-ic-border bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                          <th className="py-2.5 pl-5 pr-2 w-14">#</th>
                          <th className="py-2.5 px-4 text-ic-dark font-bold">Subcanal</th>
                          <th className="py-2.5 px-4">Canal</th>
                          <th className="py-2.5 px-4">Periodo</th>
                          <th className="py-2.5 px-4">Código</th>
                          <th className="py-2.5 px-4 text-right">Clics</th>
                          <th className="py-2.5 pr-6 pl-4 text-right w-28">Únicos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ic-border text-xs">
                        {items.map((item, idx) => (
                          <tr key={item.key} className="hover:bg-gray-50">
                            <RankCell index={idx} />
                            <td className="py-3 px-4 font-mono font-bold text-ic-dark">
                              {item.subchannel}
                            </td>
                            <td className="py-3 px-4 text-ic-slate font-medium">
                              {item.channelLabel}
                            </td>
                            <td className="py-3 px-4 font-mono text-ic-slate">
                              {item.period}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-ic-redSoft text-ic-red font-mono font-bold text-xs">
                                {item.code}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-ic-dark tabular-nums">
                              {item.clicks.toLocaleString()}
                            </td>
                            <td className="py-3 pr-6 pl-4 text-right text-ic-muted tabular-nums">
                              {item.unique.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );

                return reportPeriodFilter !== 'all' ? (
                  renderSubchannelsTable(resultsBySubchannel)
                ) : (
                  <div className="divide-y divide-ic-border">
                    {distinctPeriodsInFilter.map((per) => {
                      const perItems = buildSubchannelsRanking(
                        filteredRecords.filter((r) => r.period === per)
                      );
                      const perClicks = perItems.reduce((s, i) => s + i.clicks, 0);
                      const perUnique = perItems.reduce((s, i) => s + i.unique, 0);
                      const accKey = `subch-${per}`;
                      const isOpen = openAccordions[accKey] ?? true;

                      return (
                        <div key={accKey}>
                          <button
                            type="button"
                            onClick={() => toggleAccordion(accKey)}
                            className="w-full px-6 py-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-ic-red" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-ic-muted" />
                              )}
                              <span className="text-xs font-semibold uppercase text-ic-muted">
                                Periodo:
                              </span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-ic-border text-ic-red">
                                {per}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs tabular-nums">
                              <span className="font-bold text-ic-dark">
                                {perClicks.toLocaleString()} clics
                              </span>
                              <span className="text-ic-muted">
                                {perUnique.toLocaleString()} únicos
                              </span>
                            </div>
                          </button>
                          {isOpen && renderSubchannelsTable(perItems)}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <MinimalBarChart
                title="Comparativa Visual por Subcanal"
                items={resultsBySubchannel.map((s) => ({
                  label: s.subchannel,
                  sublabel: s.channelLabel,
                  clicks: s.clicks,
                  unique: s.unique,
                }))}
              />
            </section>

            {/* ===============================================================
                5. RESULTADO POR NÚMERO DE WHATSAPP Y 6. RESULTADO POR PERIODO
               =============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-white border border-ic-border">
                <div className="px-6 py-4 border-b border-ic-border flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    5. Resultado por Número de WhatsApp
                  </h2>
                </div>

                {(() => {
                  const renderWaTable = (items: ReturnType<typeof buildWhatsAppRanking>) => (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-ic-border bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                          <th className="py-2.5 pl-5 pr-2 w-14">#</th>
                          <th className="py-2.5 px-4 text-ic-dark font-bold">Teléfono</th>
                          <th className="py-2.5 px-4">Etiqueta / Responsable</th>
                          <th className="py-2.5 px-4 text-right">Clics</th>
                          <th className="py-2.5 pr-6 pl-4 text-right">Únicos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ic-border text-xs">
                        {items.map((item, idx) => (
                          <tr key={item.phone} className="hover:bg-gray-50">
                            <RankCell index={idx} />
                            <td className="py-3 px-4 font-mono font-bold text-ic-dark">
                              +{item.phone}
                            </td>
                            <td className="py-3 px-4 font-medium text-ic-slate">
                              {item.label}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-ic-dark tabular-nums">
                              {item.clicks.toLocaleString()}
                            </td>
                            <td className="py-3 pr-6 pl-4 text-right text-ic-muted tabular-nums">
                              {item.unique.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );

                  return reportPeriodFilter !== 'all' ? (
                    renderWaTable(resultsByWhatsApp)
                  ) : (
                    <div className="divide-y divide-ic-border">
                      {distinctPeriodsInFilter.map((per) => {
                        const perItems = buildWhatsAppRanking(
                          filteredRecords.filter((r) => r.period === per)
                        );
                        const perClicks = perItems.reduce((s, i) => s + i.clicks, 0);
                        const accKey = `wa-${per}`;
                        const isOpen = openAccordions[accKey] ?? true;

                        return (
                          <div key={accKey}>
                            <button
                              type="button"
                              onClick={() => toggleAccordion(accKey)}
                              className="w-full px-6 py-2.5 bg-gray-50/80 hover:bg-gray-100 flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4 text-ic-red" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-ic-muted" />
                                )}
                                <span className="text-xs font-mono font-bold text-ic-red">
                                  Periodo {per}
                                </span>
                              </div>
                              <span className="text-xs font-bold tabular-nums">
                                {perClicks.toLocaleString()} clics
                              </span>
                            </button>
                            {isOpen && renderWaTable(perItems)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>

              {/* =============================================================
                  6. RESULTADO POR PERIODO
                 ============================================================= */}
              <section className="bg-white border border-ic-border">
                <div className="px-6 py-4 border-b border-ic-border flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    6. Resultado por Periodo
                  </h2>
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-ic-border bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wider text-ic-muted">
                      <th className="py-2.5 pl-5 pr-2 w-14">#</th>
                      <th className="py-2.5 px-4 text-ic-dark font-bold">Periodo</th>
                      <th className="py-2.5 px-4">Estado</th>
                      <th className="py-2.5 px-4 text-right">Clics</th>
                      <th className="py-2.5 pr-6 pl-4 text-right">Únicos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ic-border text-xs">
                    {resultsByPeriod.map((item, idx) => (
                      <tr key={item.period} className="hover:bg-gray-50">
                        <RankCell index={idx} />
                        <td className="py-3 px-4 font-mono font-bold text-ic-dark">
                          {item.period}
                        </td>
                        <td className="py-3 px-4">
                          {item.isActive ? (
                            <span className="px-2 py-0.5 bg-ic-red text-white text-[10px] font-semibold uppercase">
                              Activo Global
                            </span>
                          ) : (
                            <span className="text-ic-muted">Histórico</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-ic-dark tabular-nums">
                          {item.clicks.toLocaleString()}
                        </td>
                        <td className="py-3 pr-6 pl-4 text-right text-ic-muted tabular-nums">
                          {item.unique.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </>
        )}

        {/* ===================================================================
            MÓDULO 02: GENERADOR DE ENLACES
           =================================================================== */}
        {activeModule === 'generator' && (
          <div className="space-y-6">
            <div className="border-b border-ic-border pb-4 flex items-center justify-between">
              <h1 className="text-2xl font-serif font-bold text-ic-dark">
                Generador de Enlaces
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ic-muted">Periodo Activo Global:</span>
                <span className="px-2.5 py-1 bg-ic-red text-white font-mono font-bold">
                  {activePeriod || 'Sin definir'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* FORMULARIO CREADOR */}
              <div className="lg:col-span-5 bg-white border border-ic-border p-6 space-y-4">
                <form onSubmit={handleCreateLink} className="space-y-4">
                  {/* 1. CANAL */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ic-dark mb-1.5">
                      1. Canal *
                    </label>
                    <select
                      value={genChannel}
                      onChange={(e) => setGenChannel(e.target.value as ChannelKey)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-ic-border bg-white focus:outline-none focus:border-ic-dark"
                    >
                      <option value="web_institucional">Orgánico</option>
                      <option value="link_ads">Pauta</option>
                      <option value="mailing_sms_chattigo">Nurturing (mixto)</option>
                      <option value="asesor_prospector">Asesor / Prospector</option>
                    </select>
                  </div>

                  {/* 2. SUBCANAL (Unido jerárquicamente al Canal elegido) */}
                  {genChannel !== 'asesor_prospector' ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-ic-dark">
                          2. Subcanal ({CHANNEL_LABELS[genChannel]}) *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setCfgParentChannel(genChannel);
                            setActiveModule('tools');
                          }}
                          className="text-[11px] text-ic-red font-medium hover:underline"
                        >
                          + Crear Subcanal
                        </button>
                      </div>
                      <select
                        value={genSubchannel}
                        onChange={(e) => setGenSubchannel(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                      >
                        {availableSubchannelsForGen.length === 0 ? (
                          <option value="">— Crear subcanal en Configuración —</option>
                        ) : (
                          availableSubchannelsForGen.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-ic-dark">
                          2. Asesor (Subcanal) *
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
                        {advisors.length === 0 ? (
                          <option value="">— Crear asesor en Configuración —</option>
                        ) : (
                          advisors.map((adv) => (
                            <option key={adv.id} value={adv.name}>
                              {adv.name} (+{adv.phone_number})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  {/* 3. CAMPAÑA (Creada en Configuración) Y 4. CARRERA + PERIODO INFORMATIVO */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-ic-border space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-ic-dark">
                          3. Campaña *
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveModule('tools')}
                          className="text-[11px] text-ic-red font-medium hover:underline"
                        >
                          + Crear Campaña
                        </button>
                      </div>

                      <select
                        value={genSelectedCampaign}
                        onChange={(e) => setGenSelectedCampaign(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-ic-border bg-white"
                      >
                        {campaigns.length === 0 ? (
                          <option value="">— Crear campaña en Configuración —</option>
                        ) : (
                          campaigns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* 4. CARRERA */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-ic-dark">
                          4. Carrera *
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveModule('tools')}
                          className="text-[11px] text-ic-red font-medium hover:underline"
                        >
                          + Crear Carrera
                        </button>
                      </div>
                      <select
                        value={genCareer}
                        onChange={(e) => setGenCareer(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold border border-ic-border bg-white"
                      >
                        {careers.map((car) => (
                          <option key={car.id} value={car.name}>
                            {car.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PERIODO (SOLO INFORMATIVO) */}
                    <div className="pt-2 border-t border-ic-border flex items-center justify-between text-xs">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
                        Periodo Activo:
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-ic-border font-mono font-bold text-ic-red">
                        {activePeriod || 'Sin definir'}
                      </span>
                    </div>
                  </div>

                  {/* Número de WhatsApp */}
                  {genChannel !== 'asesor_prospector' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
                          Número de WhatsApp
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveModule('tools')}
                          className="text-[11px] text-ic-red font-medium hover:underline"
                        >
                          + Crear Número
                        </button>
                      </div>
                      <select
                        value={genWaPhone}
                        onChange={(e) => setGenWaPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                      >
                        {waNumbers.length === 0 ? (
                          <option value="">— Crear número en Configuración —</option>
                        ) : (
                          waNumbers.map((w) => (
                            <option key={w.id} value={w.phone_number}>
                              {w.label} (+{w.phone_number})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  {/* ESTRUCTURA DE TEXTO PRE-GENERADO (SÍ RENDERIZA EL MENSAJE FINAL) Y ESQUEMA DEL ENLACE */}
                  <div className="p-3.5 bg-[#FAFAFA] border-l-2 border-l-ic-red border border-ic-border space-y-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                        Estructura de Texto Pre-generado (Mensaje Final):
                      </div>
                      <div className="text-xs text-ic-dark font-mono bg-white p-2.5 border border-ic-border leading-relaxed">
                        {renderedFinalWhatsAppMessage}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                        Tu enlace se verá así:
                      </div>
                      <div className="p-2.5 bg-white border border-ic-border font-mono text-[11px] text-ic-dark break-all">
                        https://trace.icontinental.edu.pe/[CANAL]?subcanal=[SUBCANAL]&amp;campana=[CAMPAÑA]&amp;carrera=[CARRERA]&amp;periodo=[PERIODO]
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-end">
                      <label className="flex items-center gap-1.5 text-xs text-ic-dark cursor-pointer">
                        <input
                          type="checkbox"
                          checked={genIsPurgeable}
                          onChange={(e) => setGenIsPurgeable(e.target.checked)}
                          className="accent-ic-red"
                        />
                        <FlaskConical className="w-3.5 h-3.5 text-ic-red" />
                        <span>Definir como enlace de prueba (depurable)</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-ic-red hover:bg-ic-redHover text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Guardar Enlace
                  </button>

                  {genFeedbackMessage && (
                    <div className="p-2.5 bg-green-50 border border-green-200 text-xs text-green-900 font-medium">
                      {genFeedbackMessage}
                    </div>
                  )}
                </form>
              </div>

              {/* LISTA DE ENLACES ACTIVOS */}
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
                      placeholder="Buscar campaña, subcanal, carrera..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-ic-border focus:outline-none"
                    />
                  </div>
                </div>

                <div className="divide-y divide-ic-border">
                  {links
                    .filter(
                      (l) =>
                        l.campaign.toLowerCase().includes(linkSearch.toLowerCase()) ||
                        l.career.toLowerCase().includes(linkSearch.toLowerCase()) ||
                        l.period.toLowerCase().includes(linkSearch.toLowerCase()) ||
                        l.subcampaign.toLowerCase().includes(linkSearch.toLowerCase())
                    )
                    .map((link) => {
                      const codeDisplay = buildAttentionCode({
                        channel: link.channel,
                        subchannel: link.subcampaign,
                        campaign: link.campaign,
                        career: link.career,
                        period: link.period,
                      });
                      return (
                        <div
                          key={link.id}
                          className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-gray-100 text-ic-dark">
                                {CHANNEL_LABELS[link.channel]} ({link.subcampaign})
                              </span>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-ic-redSoft text-ic-red">
                                {codeDisplay}
                              </span>
                              <span className="text-xs font-mono text-ic-slate">
                                {link.campaign}
                              </span>
                              <span className="text-xs font-semibold text-ic-dark">
                                {link.career}
                              </span>
                              {link.is_purgeable && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                                  DEPURABLE
                                </span>
                              )}
                            </div>

                            {/* Versión completa del enlace */}
                            <div className="font-mono text-xs text-ic-dark break-all">
                              {link.normal_url}
                            </div>

                            {/* Versión acortada impresa en texto debajo de la completa */}
                            <div className="font-mono text-xs font-bold text-ic-red flex items-center gap-1.5">
                              <Scissors className="w-3 h-3" />
                              <span>{link.short_url}</span>
                            </div>

                            <div className="text-[11px] text-ic-muted truncate">
                              {link.whatsapp_message}
                            </div>
                          </div>

                          <div className="flex items-start gap-2 flex-shrink-0">
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => copyToClipboard(link.normal_url, `link-${link.id}`)}
                                className="px-3 py-1.5 bg-ic-dark hover:bg-black text-white text-xs font-medium flex items-center justify-center gap-1.5 w-28"
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
                                onClick={() =>
                                  copyToClipboard(link.short_url, `short-${link.id}`)
                                }
                                className="px-3 py-1.5 bg-ic-red hover:bg-ic-redHover text-white text-xs font-medium flex items-center justify-center gap-1.5 w-28"
                              >
                                {copiedKey === `short-${link.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Copiado
                                  </>
                                ) : (
                                  <>
                                    <Scissors className="w-3.5 h-3.5" /> Acortado
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => {
                                  setQrSelectedUrl(link.short_url);
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
                                      description: `Se eliminará ${codeDisplay} (${link.career}).`,
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
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MÓDULO 03: CONFIGURACIÓN
            (1. Canales y Subcanales, 2. Campañas, 3. Periodos, 4. Carreras, 5. Asesores, 6. WhatsApp, 7. QR y Simulador)
           =================================================================== */}
        {activeModule === 'tools' && (
          <div className="space-y-8">
            <div className="border-b border-ic-border pb-4">
              <h1 className="text-2xl font-serif font-bold text-ic-dark">
                Configuración
              </h1>
            </div>

            {/* 1. BLOQUE JERÁRQUICO: CANALES Y SUBCANALES */}
            <section className="bg-white border border-ic-border p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-ic-border pb-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    1. Canales y Subcanales (Jerárquico)
                  </h2>
                </div>
                <span className="text-xs font-mono text-ic-muted">
                  Selecciona un Canal para gestionar sus Subcanales
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ic-muted">
                    Canales Existentes
                  </div>
                  <div className="border border-ic-border divide-y divide-ic-border">
                    {(['web_institucional', 'link_ads', 'mailing_sms_chattigo'] as ChannelKey[]).map(
                      (ch) => {
                        const count = subchannels.filter((s) => s.channel === ch).length;
                        const isSelected = cfgParentChannel === ch;
                        return (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setCfgParentChannel(ch)}
                            className={`w-full p-3 text-left text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-ic-redSoft text-ic-red font-bold'
                                : 'bg-white text-ic-dark hover:bg-gray-50'
                            }`}
                          >
                            <span>{CHANNEL_LABELS[ch]}</span>
                            <span className="font-mono text-[11px]">
                              {count} subcanales
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-3">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newSubchannelInput.trim()) return;
                      await DataEngine.createSubchannel(cfgParentChannel, newSubchannelInput);
                      setNewSubchannelInput('');
                      refreshLocalState();
                    }}
                    className="flex gap-2"
                  >
                    <div className="px-3 py-2 bg-[#FAFAFA] border border-ic-border text-xs font-semibold text-ic-dark flex items-center">
                      {CHANNEL_LABELS[cfgParentChannel]} →
                    </div>
                    <input
                      type="text"
                      required
                      value={newSubchannelInput}
                      onChange={(e) => setNewSubchannelInput(e.target.value)}
                      placeholder="Nuevo subcanal (ej: portal-web, landing-page, tiktok-ads, whatsapp)"
                      className="flex-1 px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-ic-red text-white text-xs font-semibold uppercase tracking-wider"
                    >
                      Agregar Subcanal
                    </button>
                  </form>

                  <div className="border border-ic-border divide-y divide-ic-border">
                    {subchannels
                      .filter((s) => s.channel === cfgParentChannel)
                      .map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase px-2 py-0.5 bg-gray-100 text-ic-muted font-semibold">
                              {CHANNEL_LABELS[sub.channel]}
                            </span>
                            <span className="font-mono font-bold text-ic-dark">
                              {sub.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                title: `¿Seguro que quieres eliminar el subcanal "${sub.name}"?`,
                                description: `Pertenece al canal ${CHANNEL_LABELS[sub.channel]}.`,
                                onConfirm: async () => {
                                  await DataEngine.deleteSubchannel(sub.id);
                                  refreshLocalState();
                                },
                              })
                            }
                            className="p-1 text-ic-muted hover:text-ic-red"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. CREACIÓN DE CAMPAÑAS Y 3. CREACIÓN DE CARRERAS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <section className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-ic-border pb-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-ic-red" />
                    <h2 className="text-base font-serif font-bold text-ic-dark">
                      2. Creación de Campañas
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-ic-muted">
                    {campaigns.length} campañas
                  </span>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newCampaignInput.trim()) return;
                    await DataEngine.createCampaign(newCampaignInput);
                    setNewCampaignInput('');
                    refreshLocalState();
                  }}
                  className="space-y-1.5"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      maxLength={30}
                      value={newCampaignInput}
                      onChange={(e) =>
                        setNewCampaignInput(sanitizeCampaignInput(e.target.value))
                      }
                      placeholder="EJ: PRESENCIAL, SEMIPRESENCIAL, A_DISTANCIA, EVENTOS"
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold border border-ic-border bg-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-ic-red text-white text-xs font-semibold uppercase tracking-wider"
                    >
                      Agregar Campaña
                    </button>
                  </div>
                  <div className="text-[10px] text-ic-muted flex justify-between">
                    <span>Solo MAYÚSCULAS y _ (espacio = _)</span>
                    <span className="font-mono">{newCampaignInput.length}/30</span>
                  </div>
                </form>

                <div className="border border-ic-border divide-y divide-ic-border max-h-64 overflow-y-auto">
                  {campaigns.map((camp) => (
                    <div
                      key={camp}
                      className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                    >
                      <span className="font-mono font-bold text-ic-dark">{camp}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            title: `¿Seguro que quieres eliminar la campaña "${camp}"?`,
                            description: 'Se quitará de la lista de campañas disponibles.',
                            onConfirm: async () => {
                              await DataEngine.deleteCampaign(camp);
                              refreshLocalState();
                            },
                          })
                        }
                        className="p-1 text-ic-muted hover:text-ic-red"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. MÓDULO DE CREACIÓN DE CARRERAS */}
              <section className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-ic-border pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-ic-red" />
                    <h2 className="text-base font-serif font-bold text-ic-dark">
                      3. Creación de Carreras
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-ic-muted">
                    {careers.length} carreras
                  </span>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newCareerInput.trim()) return;
                    await DataEngine.createCareer(newCareerInput);
                    setNewCareerInput('');
                    refreshLocalState();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    required
                    value={newCareerInput}
                    onChange={(e) => setNewCareerInput(e.target.value)}
                    placeholder="Nombre de la carrera (Ej: Gastronomía)"
                    className="flex-1 px-3 py-2 text-xs border border-ic-border bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-ic-red text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    Agregar Carrera
                  </button>
                </form>

                <div className="border border-ic-border divide-y divide-ic-border max-h-64 overflow-y-auto">
                  {careers.map((car) => (
                    <div
                      key={car.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                    >
                      <span className="font-semibold text-ic-dark">{car.name}</span>
                      {careers.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({
                              title: `¿Seguro que quieres eliminar la carrera "${car.name}"?`,
                              description: 'Se quitará de la lista de carreras disponibles.',
                              onConfirm: async () => {
                                await DataEngine.deleteCareer(car.id);
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
                  ))}
                </div>
              </section>
            </div>

            {/* 4. PERIODOS Y 5. ASESORES */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <section className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-ic-border pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-ic-red" />
                    <h2 className="text-base font-serif font-bold text-ic-dark">
                      4. Periodos (Estado Global)
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
                      setReportPeriodFilter(newPeriodInput);
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
                              setReportPeriodFilter(p.code);
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
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-ic-muted px-1.5">
                            En uso
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="lg:col-span-6 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <UserCheck className="w-4 h-4 text-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    5. Asesores / Prospectores
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
                    {editingAdvisorId ? 'Actualizar' : 'Agregar'}
                  </button>
                </form>

                <div className="border border-ic-border divide-y divide-ic-border">
                  {advisors.map((adv) => (
                    <div
                      key={adv.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                    >
                      <div>
                        <span className="font-semibold text-ic-dark">{adv.name}</span>{' '}
                        <span className="font-mono text-ic-red">+{adv.phone_number}</span>
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
                              description: 'Se quitará de la lista de asesores.',
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

            {/* 6. WHATSAPP, 7. CÓDIGO QR Y 8. SIMULADOR (SOLO ENLACES YA GENERADOS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <section className="lg:col-span-4 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <Phone className="w-4 h-4 text-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    6. Números de WhatsApp
                  </h2>
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
                      default_greeting: '',
                    });
                    setEditingWaId(null);
                    setWaLabelInput('');
                    setWaPhoneInput('');
                    refreshLocalState();
                  }}
                  className="space-y-2"
                >
                  <input
                    type="text"
                    required
                    value={waLabelInput}
                    onChange={(e) => setWaLabelInput(e.target.value)}
                    placeholder="Etiqueta (Ej: Admisión)"
                    className="w-full px-3 py-2 text-xs border border-ic-border bg-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={waPhoneInput}
                      onChange={(e) => setWaPhoneInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="51987654321"
                      className="flex-1 px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-ic-red text-white text-xs font-semibold uppercase"
                    >
                      {editingWaId ? 'Actualizar' : 'Guardar'}
                    </button>
                  </div>
                </form>

                <div className="border border-ic-border divide-y divide-ic-border">
                  {waNumbers.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-semibold text-ic-dark">{w.label}</div>
                        <div className="font-mono font-bold text-ic-red">
                          +{w.phone_number}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
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
                        <button
                          onClick={() =>
                            setConfirmDelete({
                              title: '¿Seguro que quieres eliminar este número de WhatsApp?',
                              description: `Se eliminará "${w.label}" (+${w.phone_number}).`,
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
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="lg:col-span-4 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <QrCode className="w-4 h-4 text-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    7. Código QR
                  </h2>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                    Enlace Generado Activo
                  </label>
                  <select
                    value={qrSelectedUrl}
                    onChange={(e) => setQrSelectedUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                  >
                    {generatedLinkOptions.length === 0 ? (
                      <option value="">— Sin enlaces generados —</option>
                    ) : (
                      generatedLinkOptions.map((opt) => (
                        <option key={opt.id} value={opt.short_url}>
                          {opt.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-4 p-3 bg-[#FAFAFA] border border-ic-border">
                  <div className="bg-white p-2 border border-ic-border">
                    {qrPngUrl && (
                      <img src={qrPngUrl} alt="QR" className="w-24 h-24 object-contain" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setQrColor('#111827')}
                        className="px-2 py-1 text-xs border border-ic-border bg-white"
                      >
                        Negro
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrColor('#E4000B')}
                        className="px-2 py-1 text-xs border border-ic-red text-ic-red bg-white"
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

              {/* SIMULADOR Y DEPURADOR DE PRUEBAS (Solo permite añadir conteo a los enlaces ya generados) */}
              <div className="lg:col-span-4 bg-white border border-ic-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-ic-border pb-3">
                  <ShieldCheck className="w-4 h-4 text-ic-red" />
                  <h2 className="text-base font-serif font-bold text-ic-dark">
                    8. Simulador y Depurador de Pruebas
                  </h2>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-ic-muted mb-1">
                    Enlace Generado Activo
                  </label>
                  <select
                    value={simLinkId}
                    onChange={(e) => setSimLinkId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-ic-border bg-white"
                  >
                    {generatedLinkOptions.length === 0 ? (
                      <option value={0}>— Sin enlaces generados —</option>
                    ) : (
                      generatedLinkOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

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
                    disabled={links.length === 0}
                    onClick={async () => {
                      const res = await DataEngine.simulateTestClick({
                        linkId: simLinkId,
                        isBot: simIsBot,
                      });
                      setSimFeedback(res.message);
                      refreshLocalState();
                    }}
                    className="py-2 bg-ic-dark disabled:opacity-50 text-white text-xs font-semibold uppercase flex items-center justify-center gap-1.5"
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

      {/* =====================================================================
          FOOTER MINIMALISTA
         ===================================================================== */}
      <footer className="bg-white border-t border-ic-border mt-12">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between text-xs text-ic-muted">
          <a
            href="/app/"
            onClick={(e) => {
              e.preventDefault();
              setActiveModule('reports');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center"
            title="Ir a Inicio"
          >
            <img
              src={LOGO_IC_NEGRO}
              alt="Instituto Continental"
              className="h-5 w-auto"
            />
          </a>

          <a
            href="https://lumine.pe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ic-dark transition-colors font-medium"
          >
            Copyright © 2026
          </a>
        </div>
      </footer>
    </div>
  );
};
