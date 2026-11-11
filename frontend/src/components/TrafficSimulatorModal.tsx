import React, { useState } from 'react';
import { X, Play, ShieldAlert, CheckCircle2, ExternalLink } from 'lucide-react';
import { ClickEventItem, LinkItem } from '../types/trace';
import { DataEngine } from '../services/dataEngine';

interface Props {
  isOpen: boolean;
  links: LinkItem[];
  onClose: () => void;
  onSimulated: () => void;
}

export const TrafficSimulatorModal: React.FC<Props> = ({
  isOpen,
  links,
  onClose,
  onSimulated,
}) => {
  const [selectedLinkId, setSelectedLinkId] = useState<number>(links[0]?.id || 1);
  const [actorType, setActorType] = useState<
    'human_mobile' | 'human_desktop' | 'bot_whatsapp' | 'bot_meta' | 'burst_duplicate'
  >('human_mobile');
  const [sourceDomain, setSourceDomain] = useState('icontinental.edu.pe');
  const [sourcePath, setSourcePath] = useState('/carreras/contabilidad');
  const [utmTerm, setUtmTerm] = useState('AdSet_Jovenes_17_24_Junin');
  const [utmContent, setUtmContent] = useState('Reel_Laboratorios_Enfermeria_V2');
  const [crmBatch, setCrmBatch] = useState('');
  const [crmRef, setCrmRef] = useState('');
  const [result, setResult] = useState<{
    event: ClickEventItem;
    resolvedDestinationUrl: string;
    resolvedWhatsAppText: string | null;
  } | null>(null);

  if (!isOpen) return null;

  const handleRunSimulation = () => {
    const res = DataEngine.simulateClick({
      linkId: selectedLinkId,
      actorType,
      sourceDomain,
      sourcePath,
      utmTerm: utmTerm || undefined,
      utmContent: utmContent || undefined,
      crmBatch: crmBatch || undefined,
      crmRef: crmRef || undefined,
    });
    setResult(res);
    onSimulated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-ic-border rounded shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ic-border">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-ic-red" />
            <div>
              <h2 className="text-lg font-serif font-bold text-ic-dark">
                Simulador Interactivo del Motor de Tracking (redirect.php)
              </h2>
              <p className="text-xs text-ic-muted">
                Prueba en tiempo real cómo Trace IC detecta páginas de origen, filtra bots y actualiza los contadores al instante.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ic-muted hover:text-ic-dark hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ic-dark mb-1">
                1. Enlace Corto a Probar
              </label>
              <select
                value={selectedLinkId}
                onChange={(e) => setSelectedLinkId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white"
              >
                {links.map((l) => (
                  <option key={l.id} value={l.id}>
                    /{l.slug} — {l.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ic-dark mb-1">
                2. Tipo de Interacción (Humano vs. Bot)
              </label>
              <select
                value={actorType}
                onChange={(e) => setActorType(e.target.value as typeof actorType)}
                className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white"
              >
                <option value="human_mobile">Prospecto Real desde Celular (Android / Chrome)</option>
                <option value="human_desktop">Prospecto Real desde PC (Windows / Chrome)</option>
                <option value="bot_whatsapp">Bot Previsualizador de WhatsApp (No suma clic humano)</option>
                <option value="bot_meta">Bot Crawler de Meta Ads (No suma clic humano)</option>
                <option value="burst_duplicate">Doble Clic en Ráfaga &lt; 3 seg (Filtro anti-duplicado)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ic-dark mb-1">
                3. Página del Sitio Institucional / Origen (HTTP Referer o ?_p=)
              </label>
              <select
                value={sourcePath}
                onChange={(e) => {
                  setSourcePath(e.target.value);
                  setSourceDomain('icontinental.edu.pe');
                }}
                className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white"
              >
                <option value="/carreras/contabilidad">icontinental.edu.pe/carreras/contabilidad</option>
                <option value="/carreras/enfermeria">icontinental.edu.pe/carreras/enfermeria</option>
                <option value="/carreras/desarrollo-de-sistemas">icontinental.edu.pe/carreras/desarrollo-de-sistemas</option>
                <option value="/carreras/administracion-de-empresas">icontinental.edu.pe/carreras/administracion-de-empresas</option>
                <option value="/admision">icontinental.edu.pe/admision</option>
                <option value="/becas">icontinental.edu.pe/becas</option>
                <option value="/carreras/gastronomia">icontinental.edu.pe/carreras/gastronomia (Inferencia automática)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ic-dark mb-1">
                4. Referencia Dynamics CRM / Chattigo (Opcional: ?ref=)
              </label>
              <input
                type="text"
                value={crmRef}
                onChange={(e) => setCrmRef(e.target.value)}
                placeholder="Ej: DYN-LEAD-00581"
                className="w-full px-3 py-2 text-xs font-mono border border-ic-border rounded"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRunSimulation}
              className="flex items-center gap-2 px-4 py-2 bg-ic-red hover:bg-ic-redHover text-white text-xs font-medium rounded transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Disparar Evento en Tiempo Real
            </button>
          </div>

          {result && (
            <div className="border border-ic-border rounded p-4 bg-ic-canvas space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {result.event.is_bot ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-800">
                        Evento Clasificado como BOT / Duplicado ({result.event.bot_reason}) — Excluido de KPIs Humanos
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-700" />
                      <span className="text-green-800">
                        Clic Humano Registrado en Tiempo Real — Contadores Actualizados
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[11px] font-mono text-ic-muted">ID #{result.event.id}</span>
              </div>

              {!result.event.is_bot && (
                <>
                  <div className="text-xs text-ic-dark">
                    <span className="font-semibold">Página de origen detectada automáticamente:</span>{' '}
                    <span className="font-mono text-ic-red">{result.event.source_domain}{result.event.source_path}</span>{' '}
                    ({result.event.source_page_label})
                  </div>

                  {result.resolvedWhatsAppText && (
                    <div className="text-xs bg-white p-2.5 border border-ic-border rounded">
                      <div className="text-[11px] font-semibold text-ic-muted mb-0.5">
                        Mensaje de WhatsApp Dinámico Generado (con código para Chattigo/CRM):
                      </div>
                      <div className="font-medium text-ic-dark">“{result.resolvedWhatsAppText}”</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-ic-muted">
                    <span className="truncate max-w-md font-mono">{result.resolvedDestinationUrl}</span>
                    <a
                      href={result.resolvedDestinationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-ic-red font-medium hover:underline"
                    >
                      Probar apertura real <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
