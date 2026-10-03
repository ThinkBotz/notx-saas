import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Camera, Image, RefreshCw, AlertCircle, CheckCircle2, ScanLine } from 'lucide-react';
import { fireConfetti } from '../utils/confetti';

interface QRCameraScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: any) => void;
}

export default function QRCameraScanner({ onScan, onError }: QRCameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scan cooldown tracker to prevent multiple rapid triggers for the same code
  const lastScanTimeRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  // Discover cameras on mount
  useEffect(() => {
    let isMounted = true;

    async function initCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/rear camera on mobile devices
          const backCam = devices.find(d => /back|rear|environment|primary/i.test(d.label));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          // No enumerated cameras, but start() with facingMode might still work
          setSelectedCameraId('default');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Could not enumerate cameras, falling back to facingMode constraints:", err);
        setSelectedCameraId('default');
      }
    }

    initCameras();

    return () => {
      isMounted = false;
    };
  }, []);

  // Start or restart scanner when selected camera changes
  useEffect(() => {
    if (!selectedCameraId) return;

    let isMounted = true;
    const elementId = "qr-reader-viewport";

    const startScanner = async () => {
      setCameraError(null);

      // Stop previous instance if running
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) {
          console.warn("Error cleaning up previous scanner", e);
        }
      }

      if (!isMounted) return;

      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85);
          return { width: Math.max(220, edge), height: Math.max(220, edge) };
        },
        aspectRatio: 1.0,
      };

      const handleSuccess = (decodedText: string) => {
        const now = Date.now();
        // Ignore identical scan within 2.5 seconds
        if (
          lastScanTimeRef.current.text === decodedText &&
          now - lastScanTimeRef.current.time < 2500
        ) {
          return;
        }

        lastScanTimeRef.current = { text: decodedText, time: now };
        setLastScanned(decodedText);
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 400);
        try {
          fireConfetti(1600);
        } catch (_) {}
        if (onScanRef.current) {
          onScanRef.current(decodedText);
        }
      };

      // Frame parse miss callback - purposely empty to avoid spamming errors on non-QR frames
      const handleFrameMiss = () => {};

      try {
        if (selectedCameraId !== 'default') {
          await scanner.start(selectedCameraId, qrConfig, handleSuccess, handleFrameMiss);
        } else {
          // Try environment first, fallback to user
          try {
            await scanner.start({ facingMode: "environment" }, qrConfig, handleSuccess, handleFrameMiss);
          } catch (envErr) {
            console.warn("FacingMode environment failed, trying user camera...", envErr);
            await scanner.start({ facingMode: "user" }, qrConfig, handleSuccess, handleFrameMiss);
          }
        }
        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Camera start error:", err);
        setIsScanning(false);
        let errorMsg = "Unable to start camera.";
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
          errorMsg = "Camera permission denied. Please allow camera access in browser settings.";
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          errorMsg = "No video camera detected on this device.";
        } else if (err?.name === 'NotReadableError') {
          errorMsg = "Camera is currently used by another application.";
        }
        setCameraError(errorMsg);
        if (onErrorRef.current) {
          onErrorRef.current(new Error(errorMsg));
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(console.error);
          }
          scannerRef.current.clear();
        } catch (e) {
          console.warn("Unmount cleanup error:", e);
        }
      }
    };
  }, [selectedCameraId]);

  // Handle manual image upload scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    try {
      // Use existing scanner or create a transient one for file scanning
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode("qr-reader-viewport");
      }
      const decodedResult = await scanner.scanFile(file, true);
      setLastScanned(decodedResult);
      setIsFlashActive(true);
      setTimeout(() => setIsFlashActive(false), 400);
      try {
        fireConfetti(1600);
      } catch (_) {}
      if (onScanRef.current) {
        onScanRef.current(decodedResult);
      }
    } catch (err: any) {
      console.warn("File scan error:", err);
      const msg = "No valid QR code found in this image. Please upload a clear photo of the QR code.";
      setCameraError(msg);
      if (onErrorRef.current) {
        onErrorRef.current(new Error(msg));
      }
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-3">
      {/* Scanner Viewport with Neo-Brutalist Frame */}
      <div 
        className="relative w-full aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center"
        style={{ border: '2.5px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        <div id="qr-reader-viewport" className="w-full h-full object-cover"></div>

        {/* Neo-Brutalist Optical Viewfinder Overlay */}
        {isScanning && !cameraError && (
          <>
            {/* Top Telemetry Floating Badge */}
            <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between z-10 font-mono text-[9px] font-black uppercase bg-black text-white px-3 py-1.5 rounded border-2 border-white">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="tracking-wider">LIVE OPTICAL SENSOR</span>
              </span>
              <span className="text-[var(--nb-yellow)] font-mono text-[9px] font-black">SYS//READY</span>
            </div>

            {/* Viewfinder Target Reticle */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div 
                className="w-52 h-52 sm:w-60 sm:h-60 relative border-2 border-dashed border-white/50 bg-black/10 rounded overflow-hidden"
              >
                {/* 4 Heavy Neo-Brutalist Corner Brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[var(--nb-yellow)]" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[var(--nb-yellow)]" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[var(--nb-yellow)]" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[var(--nb-yellow)]" />

                {/* Center Target Crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                  <div className="w-8 h-[2px] bg-white" />
                  <div className="w-[2px] h-8 bg-white absolute" />
                </div>

                {/* Neo-Brutalist Laser Sweep Line (Flat solid bar, no gradients) */}
                <div className="absolute left-0 right-0 h-1 bg-[var(--nb-yellow)] border-y border-[var(--nb-ink)] nb-laser-sweep" />
              </div>

              {/* Bottom Alignment Instruction */}
              <span 
                className="absolute bottom-3 font-mono text-[9px] font-black text-black bg-[var(--nb-yellow)] px-3 py-1 rounded border-2 border-[var(--nb-ink)] uppercase tracking-wider shadow-[2px_2px_0_var(--nb-ink)]"
              >
                ALIGN QR TICKET IN RETICLE
              </span>
            </div>
          </>
        )}

        {/* Scan Success Confirmation Flash */}
        {isFlashActive && (
          <div className="absolute inset-0 bg-emerald-500/40 z-20 pointer-events-none transition-all duration-200 flex items-center justify-center">
            <div className="bg-[var(--nb-green)] text-black font-mono font-black text-xs px-4 py-2 rounded border-2 border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] animate-bounce">
              ✓ CODE VERIFIED & ADMITTED
            </div>
          </div>
        )}

        {/* Camera Permission / Hardware Error state */}
        {cameraError && (
          <div className="absolute inset-0 bg-black/95 p-5 flex flex-col items-center justify-center text-center space-y-3 z-10 text-white">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30">
              <AlertCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <p className="text-xs text-rose-300 font-bold px-2">{cameraError}</p>
            <p className="nb-label text-[9.5px] text-neutral-400">
              YOU CAN STILL UPLOAD A SCREENSHOT OR PHOTO OF THE QR CODE BELOW.
            </p>
            <button
              onClick={() => setSelectedCameraId(prev => prev === 'default' ? '' : 'default')}
              className="mt-2 nb-btn text-[10px] font-bold uppercase px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
              style={{ border: '1.5px solid white' }}
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Camera</span>
            </button>
          </div>
        )}

        {/* Loading / Initializing state */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-white">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--nb-yellow)]" />
            <span className="nb-label text-[10px] text-neutral-300 font-mono tracking-wider">STARTING SENSOR...</span>
          </div>
        )}
      </div>

      {/* Camera Controls & File Upload Bar */}
      <div className="flex items-center gap-2">
        {/* Camera Switcher */}
        {cameras.length > 1 && (
          <div className="flex-1 relative">
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full bg-[var(--nb-surface)] text-[11px] font-bold text-[var(--nb-content)] rounded-lg py-2 px-3 outline-none cursor-pointer truncate"
              style={{ border: '2px solid var(--nb-ink)' }}
            >
              {cameras.map((c, idx) => (
                <option key={c.id} value={c.id}>
                  📷 {c.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Upload QR image option */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingFile}
          className="flex-1 flex items-center justify-center gap-1.5 nb-btn-ghost text-[11px] font-bold uppercase py-2 px-3 rounded-lg cursor-pointer"
          style={{ border: '2px solid var(--nb-ink)' }}
        >
          {isProcessingFile ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Image className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
          )}
          <span>{isProcessingFile ? "Reading Code..." : "Scan from Photo"}</span>
        </button>
      </div>

      {/* Last Detected Code Indicator */}
      {lastScanned && (
        <div 
          className="flex items-center justify-between nb-card-green px-3.5 py-2.5 rounded-lg text-xs"
          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-black text-[#00D26A] flex items-center justify-center shrink-0 border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)]">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="block text-[8.5px] font-mono font-bold tracking-widest text-black/80 uppercase">
                ATTENDANCE RECORDED
              </span>
              <span className="font-mono font-bold text-black text-xs sm:text-sm tracking-tight truncate block">
                {lastScanned}
              </span>
            </div>
          </div>
          <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-black text-white shrink-0 border border-[var(--nb-ink)]">
            VERIFIED
          </span>
        </div>
      )}
    </div>
  );
}
