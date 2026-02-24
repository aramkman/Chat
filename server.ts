import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("chat.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    bio TEXT,
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    password TEXT,
    admin_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/groups", (req, res) => {
    const groups = db.prepare("SELECT * FROM groups ORDER BY created_at DESC").all();
    res.json(groups);
  });

  app.post("/api/groups", (req, res) => {
    const { name, description, password, admin_id } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO groups (id, name, description, password, admin_id) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, description, password || null, admin_id);
    
    // Auto-join admin
    db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)")
      .run(id, admin_id);

    res.json({ id, name, description, admin_id });
  });

  app.get("/api/groups/:id/messages", (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, u.username, u.avatar 
      FROM messages m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.group_id = ? 
      ORDER BY m.timestamp ASC
    `).all(req.params.id);
    res.json(messages);
  });

  app.post("/api/users", (req, res) => {
    const { id, username, bio, avatar } = req.body;
    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (existing) {
      db.prepare("UPDATE users SET username = ?, bio = ?, avatar = ? WHERE id = ?")
        .run(username, bio, avatar, id);
    } else {
      db.prepare("INSERT INTO users (id, username, bio, avatar) VALUES (?, ?, ?, ?)")
        .run(id, username, bio, avatar);
    }
    res.json({ id, username, bio, avatar });
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    res.json(user);
  });

  // WebSocket Logic
  const clients = new Map<string, Set<WebSocket>>(); // group_id -> Set of sockets

  wss.on("connection", (ws) => {
    let currentGroupId: string | null = null;
    let currentUserId: string | null = null;

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "join":
          currentGroupId = message.groupId;
          currentUserId = message.userId;
          if (!clients.has(currentGroupId!)) {
            clients.set(currentGroupId!, new Set());
          }
          clients.get(currentGroupId!)!.add(ws);
          break;

        case "chat":
          if (currentGroupId && currentUserId) {
            const msgId = uuidv4();
            const { content, msgType } = message;
            
            db.prepare("INSERT INTO messages (id, group_id, user_id, content, type) VALUES (?, ?, ?, ?, ?)")
              .run(msgId, currentGroupId, currentUserId, content, msgType || 'text');

            const user = db.prepare("SELECT username, avatar FROM users WHERE id = ?").get(currentUserId);
            
            const broadcastMsg = JSON.stringify({
              type: "chat",
              payload: {
                id: msgId,
                group_id: currentGroupId,
                user_id: currentUserId,
                content,
                type: msgType || 'text',
                timestamp: new Date().toISOString(),
                username: user.username,
                avatar: user.avatar
              }
            });

            clients.get(currentGroupId)?.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastMsg);
              }
            });
          }
          break;
        
        case "delete_message":
          // Admin check would go here
          const { messageId, adminId } = message;
          const group = db.prepare("SELECT admin_id FROM groups WHERE id = ?").get(currentGroupId);
          if (group && group.admin_id === adminId) {
            db.prepare("DELETE FROM messages WHERE id = ?").run(messageId);
            const broadcastDelete = JSON.stringify({
              type: "delete_message",
              payload: { messageId }
            });
            clients.get(currentGroupId!)?.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastDelete);
              }
            });
          }
          break;
      }
    });

    ws.on("close", () => {
      if (currentGroupId && clients.has(currentGroupId)) {
        clients.get(currentGroupId)!.delete(ws);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
