import React, { useEffect, useState } from 'react';
import { X, Download, History, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { LinkHistoryItem, LinkItem } from '../types/trace';
import { renderQrPngDataUrl, renderQrSvg } from '../utils/qrGenerator';

interface Props {
  link: LinkItem | null;
  history: LinkHistoryItem[];
  onClose: () => void;
}

export const QrAndHistoryModal: React.FC<Props> = ({ link, history, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [qrColor, setQrColor] = useState<'#111827' | '#E4000B'>('#111827');
  const [copied, setCopied] = useState(false);

  const fullShortUrl = link ? `https://trace.icontinental.edu.pe/${link.slug}` : '';

  useEffect(() => {
    if (!link) return;
    setQrDataUrl(renderQrPngDataUrl(fullShortUrl, qrColor, 600, 2));
    setQrSvgString(renderQrSvg(fullShortUrl, qrColor, 2));
  }, [link, fullShortUrl, qrColor]);

  if (!link) return null;

  const handleDownloadPng = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-TraceIC-${link.slug}.png`;
    a.click();
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-TraceIC-${link.slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-ic-border rounded shadow-xl w-full max-w-3xl overflow-hidden">
        {/* Header estilo Dynamics 365 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ic-border bg-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-ic-red rounded-sm" />
            <div>
              <h2 className="text-lg font-serif font-bold text-ic-dark">
                Código QR Dinámico y Auditoría de Destino
              </h2>
              <p className="text-xs text-ic-muted">
                {link.title} — <span className="font-mono text-ic-dark">{fullShortUrl}</span>
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

        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-ic-border">
          {/* Columna QR */}
          <div className="md:col-span-5 p-6 flex flex-col items-center bg-ic-canvas">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ic-muted mb-3 self-start">
              <QrCode className="w-4 h-4 text-ic-red" />
              QR para Impresión y Difusión
            </div>

            <div className="bg-white p-4 border border-ic-border rounded mb-4">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR ${link.slug}`}
                  className="w-48 h-48 object-contain"
                />
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-ic-muted">Tono QR:</span>
              <button
                onClick={() => setQrColor('#111827')}
                className={`px-2.5 py-1 text-xs border rounded ${
                  qrColor === '#111827'
                    ? 'border-ic-dark bg-ic-dark text-white font-medium'
                    : 'border-ic-border bg-white text-ic-dark'
                }`}
              >
                Negro Ejecutivo
              </button>
              <button
                onClick={() => setQrColor('#E4000B')}
                className={`px-2.5 py-1 text-xs border rounded ${
                  qrColor === '#E4000B'
                    ? 'border-ic-red bg-ic-red text-white font-medium'
                    : 'border-ic-border bg-white text-ic-dark'
                }`}
              >
                Rojo IC (#E4000B)
              </button>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={handleDownloadSvg}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-ic-red hover:bg-ic-redHover text-white text-xs font-medium rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Vectorial SVG (Imprenta / Diseño)
              </button>
              <button
                onClick={handleDownloadPng}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-ic-dark border border-ic-border text-xs font-medium rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar PNG Alta Resolución (600px)
              </button>
            </div>
          </div>

          {/* Columna Detalles e Historial */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between bg-white">
            <div>
              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ic-muted mb-1.5">
                  URL Corta Permanente
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fullShortUrl}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-gray-50 border border-ic-border rounded text-ic-dark"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-ic-border rounded hover:bg-gray-50"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[11px] text-ic-muted mt-1.5">
                  Puedes cambiar el número de WhatsApp o la página de destino cuando quieras sin que este código QR impreso deje de funcionar.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ic-muted mb-3">
                <History className="w-4 h-4 text-ic-red" />
                Historial de Auditoría de Destinos ({history.length})
              </div>

              {history.length === 0 ? (
                <div className="border border-ic-border rounded p-4 bg-ic-canvas text-xs text-ic-muted">
                  Este enlace mantiene su configuración de destino original desde su creación ({link.created_at.substring(0, 10)}).
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="border border-ic-border rounded p-3 bg-ic-canvas text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-ic-muted">
                        <span className="font-medium text-ic-dark">{item.change_reason}</span>
                        <span className="tabular-nums">{item.changed_at}</span>
                      </div>
                      <div className="text-[11px] text-ic-muted truncate">
                        <span className="font-semibold">Anterior:</span> {item.previous_destination}
                      </div>
                      <div className="text-[11px] text-ic-dark truncate">
                        <span className="font-semibold text-ic-red">Nuevo:</span> {item.new_destination}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-ic-border flex items-center justify-between text-xs text-ic-muted">
              <span>
                Clics Humanos: <strong className="text-ic-dark tabular-nums">{link.total_human_clicks.toLocaleString()}</strong>
              </span>
              <a
                href={
                  link.destination_type === 'whatsapp'
                    ? `https://wa.me/${link.catalog_phone || link.whatsapp_phone_override}`
                    : link.destination_url || 'https://icontinental.edu.pe'
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-ic-red hover:underline font-medium"
              >
                Inspeccionar destino final <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
