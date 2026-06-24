import express from 'express';
import { authenticate } from '../middleware/auth';

const router = express.Router();

interface IncomingCall {
  id: string;
  number: string;
  receivedAt: Date;
}

// In-memory list – ephemeral, no DB needed for calls
const pendingCalls: IncomingCall[] = [];

// POST /api/incoming-call  – called by the local Python monitor (JWT auth)
router.post('/', authenticate, (req, res) => {
  const { number } = req.body;
  if (!number) {
    res.status(400).json({ success: false, message: 'number obbligatorio' });
    return;
  }
  const call: IncomingCall = {
    id: Date.now().toString(),
    number: String(number).trim(),
    receivedAt: new Date(),
  };
  pendingCalls.push(call);
  // Tieni solo le ultime 20 chiamate
  if (pendingCalls.length > 20) pendingCalls.splice(0, pendingCalls.length - 20);
  res.json({ success: true, data: call });
});

// GET /api/incoming-call/pending  – polled by the CRM frontend every few seconds
router.get('/pending', authenticate, (req, res) => {
  // Rimuovi chiamate più vecchie di 90 secondi
  const cutoff = Date.now() - 90_000;
  const fresh = pendingCalls.filter(c => c.receivedAt.getTime() > cutoff);
  pendingCalls.length = 0;
  pendingCalls.push(...fresh);
  res.json({ success: true, data: pendingCalls });
});

// DELETE /api/incoming-call/:id  – dismiss a call (Rifiuta)
router.delete('/:id', authenticate, (req, res) => {
  const idx = pendingCalls.findIndex(c => c.id === req.params.id);
  if (idx !== -1) pendingCalls.splice(idx, 1);
  res.json({ success: true });
});

export default router;
