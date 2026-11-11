import React, { useEffect, useState } from 'react';
import { X, Save, MessageSquare, Globe } from 'lucide-react';
import {
  CHANNEL_LABELS,
  ChannelKey,
  LinkItem,
  WhatsAppNumberItem,
} from '../types/trace';

interface Props {
  isOpen: boolean;
  editingLink: LinkItem | null;
  waNumbers: WhatsAppNumberItem[];
  onClose: () => void;
  onSave: (payload: {
    title: string;
    slug?: string;
    channel: ChannelKey;
    destination_type: 'whatsapp' | 'url';
    destination_url?: string;
    whatsapp_number_id?: number;
    whatsapp_message?: string;
    campaign_name?: string;
    adgroup_name?: string;
    status?: 'active' | 'paused';
  }) => void;
}

export const LinkDrawer: React.FC<Props> = ({
  isOpen,
  editingLink,
  waNumbers,
  onClose,
  onSave,
}) => {
  const [channel, setChannel] = useState<ChannelKey>('tiktok_ads');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [adgroupName, setAdgroupName] = useState('');
  const [destinationType, setDestinationType] = useState<'whatsapp' | 'url'>('whatsapp');
  const [waNumberId, setWaNumberId] = useState<number>(1);
  const [waMessage, setWaMessage] = useState(
    'Hola Instituto Continental, deseo recibir información sobre sus carreras.'
  );
  const [destinationUrl, setDestinationUrl] = useState('https://icontinental.edu.pe/admision/');
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    if (editingLink) {
      setChannel(editingLink.channel);
      setTitle(editingLink.title);
      setSlug(editingLink.slug);
      setCampaignName(editingLink.campaign_name || '');
      setAdgroupName(editingLink.adgroup_name || '');
      setDestinationType(editingLink.destination_type);
      setWaNumberId(editingLink.whatsapp_number_id || waNumbers[0]?.id || 1);
      setWaMessage(
        editingLink.whatsapp_message ||
          'Hola Instituto Continental, deseo recibir información sobre sus carreras.'
      );
      setDestinationUrl(editingLink.destination_url || 'https://icontinental.edu.pe/admision/');
      setStatus(editingLink.status);
    } else {
      setChannel('tiktok_ads');
      setTitle('');
      setSlug('');
      setCampaignName('Admisión 2027-I');
      setAdgroupName('');
      setDestinationType('whatsapp');
      setWaNumberId(waNumbers[0]?.id || 1);
      setWaMessage('Hola Instituto Continental, deseo recibir información sobre sus carreras.');
      setDestinationUrl('https://icontinental.edu.pe/admision/');
      setStatus('active');
    }
  }, [editingLink, isOpen, waNumbers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Por favor escribe un nombre para identificar este enlace.');
      return;
    }
    try {
      onSave({
        title: title.trim(),
        slug: slug.trim() || undefined,
        channel,
        destination_type: destinationType,
        destination_url: destinationType === 'url' ? destinationUrl.trim() : undefined,
        whatsapp_number_id: destinationType === 'whatsapp' ? waNumberId : undefined,
        whatsapp_message: destinationType === 'whatsapp' ? waMessage.trim() : undefined,
        campaign_name: campaignName.trim() || undefined,
        adgroup_name: adgroupName.trim() || undefined,
        status,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-ic-border flex flex-col">
        {/* Cabecera limpia */}
        <div className="px-6 py-4 border-b border-ic-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-ic-red" />
            <div>
              <h2 className="text-lg font-serif font-bold text-ic-dark">
                {editingLink ? 'Editar Enlace' : 'Crear Nuevo Enlace'}
              </h2>
              <p className="text-xs text-ic-muted">
                Obtén un enlace corto para medir cuántos clics genera.
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-ic-redSoft border border-ic-red text-ic-red text-xs font-medium rounded">
              {errorMsg}
            </div>
          )}

          {/* Paso 1: ¿Dónde se usará? */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ic-muted">
              1. ¿Dónde vas a usar este enlace?
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as ChannelKey)}
              className="w-full px-3 py-2.5 text-xs font-medium border border-ic-border rounded bg-white focus:outline-none focus:border-ic-red"
            >
              {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            {/* Si es TikTok Ads: pedir Campaña y Conjunto de Anuncios */}
            {channel === 'tiktok_ads' && (
              <div className="p-4 bg-ic-canvas border border-ic-border rounded space-y-3">
                <div className="text-xs font-semibold text-ic-dark">
                  Datos del Anuncio en TikTok Ads
                </div>
                <div>
                  <label className="block text-xs text-ic-slate mb-1">
                    Nombre de la Campaña
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ej: Admisión 2027-I TikTok"
                    className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ic-slate mb-1">
                    Nombre del Conjunto de Anuncios
                  </label>
                  <input
                    type="text"
                    value={adgroupName}
                    onChange={(e) => setAdgroupName(e.target.value)}
                    placeholder="Ej: Conjunto Diseño de Modas (17-23 años)"
                    className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white"
                  />
                </div>
              </div>
            )}

            {/* Si es Chattigo / Dynamics CRM: pedir solo nombre del envío */}
            {channel === 'chattigo_crm' && (
              <div className="p-4 bg-ic-canvas border border-ic-border rounded space-y-3">
                <div className="text-xs font-semibold text-ic-dark">
                  Identificación del Envío (Chattigo / Dynamics CRM)
                </div>
                <p className="text-[11px] text-ic-muted">
                  Usa este enlace dentro de los mensajes que envíes por Chattigo o correo para saber cuántos postulantes hicieron clic.
                </p>
                <div>
                  <label className="block text-xs text-ic-slate mb-1">
                    Nombre de la Campaña o Base
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ej: Postulantes Pregrado 2027-I"
                    className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ic-slate mb-1">
                    Nombre del Envío o Plantilla de Chattigo
                  </label>
                  <input
                    type="text"
                    value={adgroupName}
                    onChange={(e) => setAdgroupName(e.target.value)}
                    placeholder="Ej: Envío Masivo Cierre de Inscripciones"
                    className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Paso 2: Nombre y Link Corto */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ic-muted">
              2. Nombre del Enlace
            </label>
            <div>
              <label className="block text-xs text-ic-slate mb-1">
                Nombre descriptivo (para reconocerlo en tu tabla) *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: TikTok Ads — Diseño de Modas"
                className="w-full px-3 py-2 text-xs border border-ic-border rounded focus:outline-none focus:border-ic-red"
              />
            </div>

            <div>
              <label className="block text-xs text-ic-slate mb-1">
                Texto corto del enlace (Opcional)
              </label>
              <div className="flex items-center border border-ic-border rounded overflow-hidden focus-within:border-ic-red">
                <span className="px-3 py-2 bg-gray-50 text-xs font-mono text-ic-muted border-r border-ic-border">
                  trace.icontinental.edu.pe/
                </span>
                <input
                  type="text"
                  value={slug}
                  disabled={Boolean(editingLink)}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, '-'))
                  }
                  placeholder="tt-modas"
                  className="w-full px-3 py-2 text-xs font-mono focus:outline-none disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Paso 3: Destino */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ic-muted">
              3. ¿A dónde debe llevar cuando hagan clic?
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDestinationType('whatsapp')}
                className={`flex items-center gap-2.5 p-3 border rounded text-left ${
                  destinationType === 'whatsapp'
                    ? 'border-ic-red bg-ic-redSoft text-ic-dark'
                    : 'border-ic-border bg-white text-ic-muted hover:bg-gray-50'
                }`}
              >
                <MessageSquare
                  className={`w-4 h-4 ${
                    destinationType === 'whatsapp' ? 'text-ic-red' : 'text-ic-muted'
                  }`}
                />
                <div>
                  <div className="text-xs font-semibold text-ic-dark">Abrir WhatsApp</div>
                  <div className="text-[11px] text-ic-muted">Con un mensaje predefinido</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDestinationType('url')}
                className={`flex items-center gap-2.5 p-3 border rounded text-left ${
                  destinationType === 'url'
                    ? 'border-ic-red bg-ic-redSoft text-ic-dark'
                    : 'border-ic-border bg-white text-ic-muted hover:bg-gray-50'
                }`}
              >
                <Globe
                  className={`w-4 h-4 ${
                    destinationType === 'url' ? 'text-ic-red' : 'text-ic-muted'
                  }`}
                />
                <div>
                  <div className="text-xs font-semibold text-ic-dark">Abrir una Página Web</div>
                  <div className="text-[11px] text-ic-muted">Landing, web o folleto</div>
                </div>
              </button>
            </div>

            {destinationType === 'whatsapp' ? (
              <div className="space-y-3 bg-ic-canvas p-4 border border-ic-border rounded">
                <div>
                  <label className="block text-xs font-medium text-ic-dark mb-1">
                    Número de WhatsApp de destino
                  </label>
                  <select
                    value={waNumberId}
                    onChange={(e) => setWaNumberId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white"
                  >
                    {waNumbers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label} (+{w.phone_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ic-dark mb-1">
                    Mensaje con el que iniciará el chat en WhatsApp
                  </label>
                  <textarea
                    rows={3}
                    value={waMessage}
                    onChange={(e) => setWaMessage(e.target.value)}
                    placeholder="Hola Instituto Continental, deseo información..."
                    className="w-full px-3 py-2 text-xs border border-ic-border rounded bg-white focus:outline-none focus:border-ic-red"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-ic-dark mb-1">
                  Dirección de la Página Web (URL de destino) *
                </label>
                <input
                  type="url"
                  required
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://icontinental.edu.pe/admision/"
                  className="w-full px-3 py-2 text-xs font-mono border border-ic-border rounded focus:outline-none focus:border-ic-red"
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-ic-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-ic-dark bg-white border border-ic-border rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-ic-red hover:bg-ic-redHover rounded transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {editingLink ? 'Guardar Cambios' : 'Crear Enlace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
