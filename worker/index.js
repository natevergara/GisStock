// Cloudflare Worker — Reenvía mensajes de GisStock a Telegram.
//
// La app arma el texto completo (formato HTML de Telegram) y este Worker solo
// lo entrega, manteniendo el token del bot y el chat id como secretos
// (Variables de entorno), nunca en el código de la app.

export default {
  async fetch(request, env) {
    // CORS abierto: la app vive en otro dominio y necesita poder llamarnos.
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

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

    // Telegram corta los mensajes a 4096 caracteres.
    const text = String(data.text ?? '').slice(0, 4096);
    if (!text.trim()) {
      return json({ error: 'Mensaje vacío' }, 400, cors);
    }

    // "private" → aviso personal (solo el dueño), "group" → grupo del equipo.
    // Por defecto "group" para no romper clientes anteriores.
    const target = data.target === 'private' ? 'private' : 'group';
    const chatId = target === 'private' ? env.TELEGRAM_PRIVATE_CHAT_ID : env.TELEGRAM_GROUP_CHAT_ID;

    if (!chatId) {
      return json({ error: `Variable de entorno no configurada para target "${target}"` }, 500, cors);
    }

    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!tgRes.ok) {
      return json({ error: 'No se pudo enviar a Telegram' }, 502, cors);
    }

    return json({ ok: true }, 200, cors);
  },
};

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
