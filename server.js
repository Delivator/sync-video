const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const history = require("connect-history-api-fallback");
const fs = require("fs");
const admin = require("firebase-admin");
const { MD5 } = require("crypto-js");

if (!fs.existsSync("serviceAccountKey.json")) {
  console.log("serviceAccountKey.json not found, (See https://github.com/Delivator/sync-video#project-setup 6.)");
  process.exit(1);
}

if (!fs.existsSync("src/firebase.json")) {
  console.log("src/firebase.json not found, (See https://github.com/Delivator/sync-video#project-setup 5.)");
  process.exit(2);
}

if (!fs.existsSync("src/settings.json")) {
  console.log("src/settings.json not found, (See https://github.com/Delivator/sync-video#project-setup 6.)");
  process.exit(3);
}

const serviceAccount = require("./serviceAccountKey.json");
const firebaseConfig = require("./src/firebase.json");
const settings = require("./src/settings.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL
});

app.use(history());
app.use(express.static("./dist"));

function generateUsername() {
  const animals = "🐵🐒🦍🐶🐕🐩🐺🦊🦝🐱🐈🦁🐯🐅🐆🐴🐎🦄🦓🦌🐮🐂🐃🐄🐷🐖🐗🐽🐏🐑🐐🐪🐫🦙🦒🐘🦏🦛🐭🐁🐀🐹🐰🐇🦔🦇🐻🐨🐼🦘🦡🦃🐔🐓🐣🐤🐥🐦🐧🕊🦅🦆🦢🦉🦚🦜🐸🐊🐢🦎🐍🐲🐉🦕🦖🐳🐋🐬🐟🐠🐡🦈🐙🐚🦀🦞🦐🦑🐌🦋🐛🐜🐝🐞🦗🕷🦂🦟";
  const animal = [...animals];
  return `Anonymous ${animal[Math.floor(Math.random() * animal.length)]}`;
}

function getGravatarUrl(email) {
  return `https://www.gravatar.com/avatar/${MD5(email.trim()).toString()}`;
}

function getRoomUsers(room) {
  const rooms = io.sockets.adapter.rooms;
  let users = [];
  if (room in rooms) {
    const sockets = rooms[room].sockets;
    for (const sock in sockets) {
      if (sock in io.sockets.connected)
        users.push({
          displayName: io.sockets.connected[sock].displayName,
          avatar: io.sockets.connected[sock].avatar || null
        });
    }
  }
  return users;
}

app.get("*", (req, res) => {
  if (!fs.existsSync("./dist")) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404: Not found\nMake sure you ran npm run build before starting the server.");
  } else {
    res.status(404).send("404: Not found");
  }
});

io.on("connection", (socket) => {
  const token = socket.handshake.query.token;

  if (token) {
    admin.auth().verifyIdToken(token)
      .then(user => {
        if (user.email) socket.avatar = getGravatarUrl(user.email);
        socket.displayName = user.name ? user.name : generateUsername();
        socket.uid = user.uid;
      })
      .catch(e => {
        console.error(e);
      });
  } else {
    socket.displayName = generateUsername();
  }

  console.log(`+ ${io.engine.clientsCount} clients connected`);

  socket.on("joinRoom", (room) => {
    if (!room || room === "") return;
    console.log("socked", socket.displayName, " joined room", room);
    setTimeout(() => {
      io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
    }, 0);
    socket.join(room);
  });

  socket.on("leaveRoom", (room) => {
    if (!room || room === "") return;
    console.log("socked", socket.displayName, " left room", room);
    io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
    socket.leave(room);
  });

  socket.on("disconnecting", () => {
    for (const room in socket.rooms) {
      if (socket.rooms.hasOwnProperty(room)) {
        const room2 = socket.rooms[room];
        setTimeout(() => {
          io.to(room2).emit("roomUsersUpdate", getRoomUsers(room2));
        }, 0);
      }
    }
  })

  socket.on("authenticate", (token) => {
    if (token) {
      admin.auth().verifyIdToken(token)
        .then(user => {
          if (user.email) socket.avatar = getGravatarUrl(user.email);
          if (user.name) socket.displayName = user.name;
          socket.uid = user.uid;
          for (const r in socket.rooms) {
            if (socket.rooms.hasOwnProperty(r)) {
              const room = socket.rooms[r];
              io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
            }
          }
        })
        .catch(console.error);
    }
  });

  socket.on("sendPlayerStatusUpdate", (room, playerStatus) => {
    if (!room || room === "") return;
    socket.to(room).emit("playerStatusUpdate", playerStatus);
  });
});

server.listen(settings.nodeServerPort);
console.log(`Server running at: http://localhost:${settings.nodeServerPort}/`);