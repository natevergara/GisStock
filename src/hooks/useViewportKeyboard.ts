import { useEffect, useState } from 'preact/hooks';

/**
 * Detecta si el teclado virtual está abierto usando la VisualViewport API.
 * Cuando el viewport visible es notablemente más bajo que la ventana,
 * asumimos teclado abierto. Sirve para colapsar la imagen hero y dar lugar
 * a los inputs durante el conteo a una mano.
 *
 * Umbral alto (150px) para no confundir con la barra de URL del navegador.
 */
export function useViewportKeyboard(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      const overlap = window.innerHeight - vv!.height - vv!.offsetTop;
      setKeyboardOpen(overlap > 150);
    }

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();

    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  return keyboardOpen;
}
