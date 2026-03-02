import { useEffect, useRef } from "react";

/**
 * useBarcodeScanner
 *
 * Escucha globalmente los keystrokes del lector de código de barras USB HID.
 * Los lectores HID actúan como teclados: escriben el código muy rápido y terminan con Enter.
 * Se diferencia del tipeo manual detectando que el tiempo entre teclas es < 50ms.
 *
 * @param {(code: string) => void} onScan - Callback que recibe el código escaneado
 * @param {{ enabled?: boolean }} options - `enabled`: si es false, el hook no hace nada
 */
export function useBarcodeScanner(onScan, { enabled = true } = {}) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeDelta = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Si el Enter llega y hay algo en el buffer → es un escaneo
      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        if (code.length >= 3) {
          onScan(code);
        }
        bufferRef.current = "";
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }

      // Solo acumulamos caracteres imprimibles
      if (e.key.length !== 1) return;

      // Si el tiempo entre teclas es mayor a 50ms, es probablemente tipeo manual.
      // Reiniciamos el buffer para evitar lecturas incorrectas.
      if (timeDelta > 50 && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      bufferRef.current += e.key;

      // Timer de limpieza: si en 300ms no llega el Enter, limpiamos el buffer
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        bufferRef.current = "";
      }, 300);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, onScan]);
}
