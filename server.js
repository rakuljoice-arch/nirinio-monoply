import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = Number(process.env.PORT) || 3000;

// Serve static files (CSS, JS, images) from the same folder as server.js.
app.use(express.static(__dirname));

// Serve the Monopoly page from index.html in the project root.
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Basic health check for hosting platforms.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Socket.IO connection hook for the multiplayer frontend.
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`NIRINO Monopoly web running on port ${PORT}`);
});
