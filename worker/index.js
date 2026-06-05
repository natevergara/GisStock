// Cloudflare Worker — Avisos de GisStock a Telegram
//
// Recibe un POST desde la app cuando alguien exporta stock y reenvía
// un resumen a Telegram. El token del bot y el chat id viven aquí como
// "secretos" (Variables de entorno), nunca en el código de la app.

export default {
  async fetch(request, env) {
    // CORS abierto: la app vive en otro dominio y necesita poder llamarnos.
    // Riesgo bajo (solo se envían avisos, no hay datos sensibles).
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // El navegador manda primero un "preflight" OPTIONS antes del POST real.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido' }, 405, cors);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ error: 'JSON inválido' }, 400, cors);
    }

    const usuario = sanitize(data.usuario) || 'Alguien';
    const producto = sanitize(data.producto) || '—';
    const codigo = sanitize(data.codigo) || '';
    const variaciones = Number(data.variaciones) || 0;

    const hora = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const plural = variaciones === 1 ? '' : 'es';
    const texto =
      `📦 *GisStock — Exportación*\n\n` +
      `👤 ${usuario}\n` +
      `🏷️ ${producto}${codigo ? ` (${codigo})` : ''}\n` +
      `🔢 ${variaciones} variación${plural} contada${plural === 'es' ? 's' : ''}\n` +
      `🕒 ${hora}`;

    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: texto,
        parse_mode: 'Markdown',
      }),
    });

    if (!tgRes.ok) {
      return json({ error: 'No se pudo enviar a Telegram' }, 502, cors);
    }

    return json({ ok: true }, 200, cors);
  },
};

// Limpia el texto: evita saltos de línea y caracteres que rompen el formato
// Markdown de Telegram, y corta a un largo razonable.
function sanitize(value) {
  return String(value ?? '')
    .replace(/[\n\r*_`\[\]]/g, ' ')
    .trim()
    .slice(0, 80);
}

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
