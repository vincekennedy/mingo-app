import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Renders a QR code for a join URL (data URL image).
 * Useful for bar / venue bingo — players scan and land on /join/:code.
 */
export default function JoinQrCode({ url, size = 180, className = '' }) {
  const [payload, setPayload] = useState({ url: '', dataUrl: '', failed: false });

  useEffect(() => {
    if (!url) return undefined;

    let cancelled = false;

    QRCode.toDataURL(url, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1f2937', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setPayload({ url, dataUrl, failed: false });
      })
      .catch(() => {
        if (!cancelled) setPayload({ url, dataUrl: '', failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!url) return null;

  const ready = payload.url === url;
  const dataUrl = ready ? payload.dataUrl : '';
  const failed = ready ? payload.failed : false;

  if (failed) {
    return (
      <p className="text-sm text-gray-500" role="status">
        Could not generate QR code. Use the join link instead.
      </p>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`mx-auto bg-gray-100 animate-pulse rounded-lg ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR code to join this game"
      width={size}
      height={size}
      className={`mx-auto rounded-lg bg-white ${className}`}
      data-testid="join-qr-code"
    />
  );
}
