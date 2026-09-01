// Gestionnaire Server-Sent Events (SSE) pour synchronisation temps réel

let clients = [];

export function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = Date.now() + Math.random().toString(36).substring(2, 9);
  const newClient = { id: clientId, res };
  clients.push(newClient);

  // Envoyer un message de bienvenue / heartbeat
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
}

export function broadcastUpdate(type, payload = {}) {
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  clients.forEach(client => {
    try {
      client.res.write(`data: ${message}\n\n`);
    } catch (e) {
      console.error('Erreur envoi SSE au client', client.id, e);
    }
  });
}
