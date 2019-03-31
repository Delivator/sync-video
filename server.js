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
const rooms = {};

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
      const socket2 = io.sockets.connected[sock];
      if (sock in io.sockets.connected)
        users.push({
          displayName: socket2.displayName,
          avatar: socket2.avatar || null,
          id: socket2.id
        });
    }
  }
  return users;
}

// https://stackoverflow.com/a/7180095/6287225
Array.prototype.move2 = function(pos1, pos2) {
  // local variables
  var i, tmp;
  // cast input parameters to integers
  pos1 = parseInt(pos1, 10);
  pos2 = parseInt(pos2, 10);
  // if positions are different and inside array
  if (pos1 !== pos2 && 0 <= pos1 && pos1 <= this.length && 0 <= pos2 && pos2 <= this.length) {
    // save element from position 1
    tmp = this[pos1];
    // move element down and shift other elements up
    if (pos1 < pos2) {
      for (i = pos1; i < pos2; i++) {
        this[i] = this[i + 1];
      }
    }
    // move element up and shift other elements down
    else {
      for (i = pos1; i > pos2; i--) {
        this[i] = this[i - 1];
      }
    }
    // put element from position 1 to destination
    this[pos2] = tmp;
  }
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
    console.log("socked", socket.displayName, "joined room", room);
    socket.join(room);
    setTimeout(() => {
      io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
      if (rooms[room] && rooms[room].queue) socket.emit("updateQueue", rooms[room].queue);
    }, 0);
  });

  socket.on("leaveRoom", (room) => {
    if (!room || room === "") return;
    console.log("socked", socket.displayName, "left room", room);
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
    if (!rooms[room] || !rooms[room].queue) {
      rooms[room] = {};
      rooms[room].playerStatus = {};
    }
    playerStatus.eventTime = new Date().getTime();
    rooms[room].playerStatus = playerStatus;
    socket.to(room).emit("playerStatusUpdate", playerStatus);
  });

  socket.on("sendVideoUpdate", (room, videoObj) => {
    if (!room || !videoObj) return;
    if (!rooms[room] || !rooms[room].queue) {
      rooms[room] = {};
      rooms[room].queue = [];
    }
    const uid = MD5(videoObj.videoId + new Date().getTime().toString()).toString();
    rooms[room].queue.push({ ...{ uid }, ...videoObj });
    io.to(room).emit("updateQueue", rooms[room].queue);
  });

  socket.on("removeVideo", (room, uid) => {
    if (!room || !uid || !rooms || !rooms[room] || !rooms[room].queue) return;
    rooms[room].queue.forEach((video, index) => {
      if (video.uid === uid) rooms[room].queue.splice(index, 1);
    });
    io.to(room).emit("updateQueue", rooms[room].queue);
  });

  socket.on("pushVideo", (room, uid) => {
    if (!room || !uid || !rooms || !rooms[room] || !rooms[room].queue) return;
    rooms[room].queue.forEach((video, index) => {
      if (video.uid === uid) rooms[room].queue.move2(index, 0);
    });
    io.to(room).emit("updateQueue", rooms[room].queue);
  });

  socket.on("getQueue", (room) => {
    if (!room || !rooms || !rooms[room]) return;
    io.to(socket).emit("updateQueue", rooms[room].queue);
  });

  socket.on("getPlayerStatus", (room) => {
    console.log("getPlayerStatus", room);
    if (!room || !rooms || !rooms[room] || !rooms[room].playerStatus) return;
    let playerStatus = rooms[room].playerStatus;
    if (playerStatus.status === "play") {
      const timeElapsed = (new Date().getTime() - rooms[room].playerStatus.eventTime) / 1000;
      playerStatus.currentTime += timeElapsed;
    }
    socket.emit("playerStatusUpdate", playerStatus);
  });
});

server.listen(settings.nodeServerPort);
console.log(`Server running at: http://localhost:${settings.nodeServerPort}/`);