import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { generateJoinQrDataUrl } from '../lib/printJoinFlyer';

/**
 * Full-page printable join flyer (opened in a new tab from the host lobby).
 * Layout is optimized for paper handouts at bars / events.
 */
export default function PrintJoinFlyerScreen({ code, title, joinUrl }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState(null);

  useEffect(() => {
    if (!joinUrl) return undefined;
    let cancelled = false;
    generateJoinQrDataUrl(joinUrl, 640)
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setQrError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl('');
          setQrError('Could not generate QR code.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  return (
    <div className="print-flyer min-h-screen bg-white text-gray-900">
      <style>{`
        @media print {
          @page { margin: 0.6in; }
          body { background: white !important; }
          .print-flyer-no-print { display: none !important; }
          .print-flyer { min-height: auto !important; }
        }
      `}</style>

      <div className="print-flyer-no-print sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Print this page and hand it out — players scan to join.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 mingo-btn-primary font-semibold rounded-lg text-sm"
            data-testid="print-flyer-button"
          >
            <Printer size={16} /> Print
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg text-sm hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>

      <main
        className="max-w-xl mx-auto px-6 py-10 sm:py-14 text-center space-y-6"
        data-testid="print-join-flyer"
      >
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-gray-500">Mingo</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">Join the game</h1>
          {title ? (
            <h2 className="mt-3 text-xl sm:text-2xl font-semibold mingo-text-brand">{title}</h2>
          ) : null}
        </div>

        <div className="flex justify-center py-2">
          {qrError ? (
            <p className="text-sm text-red-600" role="alert">
              {qrError}
            </p>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code to join game ${code}`}
              width={280}
              height={280}
              className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] bg-white border border-gray-200 rounded-lg"
              data-testid="join-qr-code"
            />
          ) : (
            <div
              className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] bg-gray-100 animate-pulse rounded-lg"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Game code</p>
          <p
            className="text-4xl sm:text-5xl font-bold font-mono tracking-wider mingo-text-brand"
            data-testid="print-flyer-code"
          >
            {code}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-base text-gray-700">
            Scan the QR code with your phone camera, or open:
          </p>
          <p
            className="text-sm sm:text-base font-mono break-all text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            data-testid="print-flyer-url"
          >
            {joinUrl}
          </p>
        </div>

        <p className="text-sm text-gray-500 pt-4">
          Tip: use Print → “Save as PDF” if you want a digital flyer.
        </p>
      </main>
    </div>
  );
}
