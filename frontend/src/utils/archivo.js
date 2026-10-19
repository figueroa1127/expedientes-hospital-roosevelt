import { api } from '../api';

// Lee un archivo del disco y lo devuelve como { nombre, tipo, datos } en base64.
export function leerArchivoBase64(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result || '');
      const coma = resultado.indexOf(',');
      resolve({
        nombre: file.name,
        tipo: file.type,
        datos: coma >= 0 ? resultado.slice(coma + 1) : resultado,
      });
    };
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.readAsDataURL(file);
  });
}

export function formatoValido(tipo) {
  return ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(tipo);
}

// Descarga/abre en una pestaña el archivo adjunto de una orden de laboratorio.
export async function abrirArchivoAdjunto(token, ordenId) {
  const { nombre, tipo, datos } = await api.archivoLaboratorio(token, ordenId);
  const binario = atob(datos);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  const blob = new Blob([bytes], { type: tipo || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const ventana = window.open(url, '_blank');
  if (!ventana) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre || 'resultado';
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
