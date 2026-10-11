import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle, RefreshCw, X } from 'lucide-react';
import Modal from '../common/Modal';

const CameraScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [cameraError, setCameraError] = useState(null);
  const [manualSku, setManualSku] = useState('');
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    setCameraError(null);
    const html5QrCode = new Html5Qrcode('camera-reader-viewport');
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setCameraError('No webcam or video capture device found on your device.');
          return;
        }

        // Prefer back camera on mobile or default webcam on laptop
        const cameraId = cameras[0].id;
        isScanningRef.current = true;

        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 180 },
            aspectRatio: 1.33,
          },
          (decodedText) => {
            // Success callback
            if (isScanningRef.current) {
              isScanningRef.current = false;
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
                onScanSuccess(decodedText);
                onClose();
              }).catch(() => {
                onScanSuccess(decodedText);
                onClose();
              });
            }
          },
          (errorMessage) => {
            // Scanning frame loop - ignore frame drops
          }
        );
      } catch (err) {
        setCameraError(
          err.message || 'Camera permission was denied or camera is in use by another program.'
        );
      }
    };

    // Small delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch(() => {});
      }
    };
  }, [isOpen, onClose, onScanSuccess]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualSku.trim()) {
      onScanSuccess(manualSku.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Camera Barcode & QR Scanner" maxWidth="max-w-md">
      <div className="flex flex-col items-center">
        {/* Viewfinder Container */}
        <div className="relative w-full overflow-hidden rounded-xl bg-slate-950 min-h-[260px] flex items-center justify-center border border-slate-800">
          <div id="camera-reader-viewport" className="w-full h-full" />

          {/* Guide Overlay */}
          {!cameraError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-44 w-60 rounded-xl border-2 border-dashed border-indigo-400/80 bg-indigo-500/10 shadow-inner flex items-center justify-center">
                <span className="text-[11px] font-medium text-white/80 bg-slate-900/60 px-2 py-0.5 rounded">
                  Align Barcode / QR Code
                </span>
              </div>
            </div>
          )}

          {/* Camera Error / Permission Fallback */}
          {cameraError && (
            <div className="p-6 text-center text-rose-300 flex flex-col items-center">
              <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
              <p className="text-xs font-semibold text-rose-200 mb-1">Camera Unavailable</p>
              <p className="text-[11px] text-slate-400 max-w-xs">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Fallback Manual Entry */}
        <div className="w-full mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
            Camera issue? Enter SKU or Barcode manually:
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. COMP-MOU-001"
              value={manualSku}
              onChange={(e) => setManualSku(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default CameraScannerModal;
