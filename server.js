const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
  pingInterval: 5000
});
const history = require("connect-history-api-fallback");
const fs = require("fs");
const admin = require("firebase-admin");
const { MD5 } = require("crypto-js");

// Check for settings files
if (!fs.existsSync("src/settings.json")) {
  console.log(
    "src/settings.json not found, (See https://github.com/Delivator/sync-video#project-setup 5.)"
  );
  process.exit(1);
} else if (!fs.existsSync("src/firebase.json")) {
  console.log(
    "src/firebase.json not found, (See https://github.com/Delivator/sync-video#project-setup 6.)"
  );
  process.exit(2);
} else if (!fs.existsSync("serviceAccountKey.json")) {
  console.log(
    "serviceAccountKey.json not found, (See https://github.com/Delivator/sync-video#project-setup 7.)"
  );
  process.exit(3);
}

const serviceAccount = require("./serviceAccountKey.json");
const firebaseConfig = require("./src/firebase.json");
const settings = require("./src/settings.json");
let rooms = {};

class PlayerStatus {
  constructor(
    status = "pause",
    currentTime = 0.0,
    eventTime = new Date().getTime()
  ) {
    this.status = status;
    this.currentTime = currentTime;
    this.eventTime = eventTime;
  }
}

class Room {
  constructor(queue = [], playerStatus = new PlayerStatus(), lastRemove = 0) {
    this.queue = queue;
    this.playerStatus = playerStatus;
    this.lastRemove = lastRemove;
  }
}

// Initialize firebase admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL
});

app.use(history());
app.use(express.static("./dist"));

function generateUsername() {
  const animals =
    "🐵🐒🦍🐶🐕🐩🐺🦊🦝🐱🐈🦁🐯🐅🐆🐴🐎🦄🦓🦌🐮🐂🐃🐄🐷🐖🐗🐽🐏🐑🐐🐪🐫🦙🦒🐘🦏🦛🐭🐁🐀🐹🐰🐇🦔🦇🐻🐨🐼🦘🦡🦃🐔🐓🐣🐤🐥🐦🐧🕊🦅🦆🦢🦉🦚🦜🐸🐊🐢🦎🐍🐲🐉🦕🦖🐳🐋🐬🐟🐠🐡🦈🐙🐚🦀🦞🦐🦑🐌🦋🐛🐜🐝🐞🦗🕷🦂🦟";
  const animal = [...animals];
  return `Anonymous ${animal[Math.floor(Math.random() * animal.length)]}`;
}

function getGravatarUrl(email) {
  return `https://www.gravatar.com/avatar/${MD5(
    email.trim().toLowerCase()
  ).toString()}`;
}

function getRoomUsers(room) {
  const roomsList = io.sockets.adapter.rooms;
  let users = [];
  if (room in roomsList) {
    for (const socketInList in roomsList[room].sockets) {
      const socket = io.sockets.connected[socketInList];
      if (socketInList in io.sockets.connected)
        users.push({
          displayName: socket.displayName,
          avatar: socket.avatar || null,
          id: socket.id,
          uid: socket.uid || socket.id
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
  if (
    pos1 !== pos2 &&
    0 <= pos1 &&
    pos1 <= this.length &&
    0 <= pos2 &&
    pos2 <= this.length
  ) {
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
};

// Handle if the dist directory doesn't exist (App hasn't been build yet)
app.get("*", (req, res) => {
  if (!fs.existsSync("./dist")) {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(
      "404: Not found<br>If your the host, make sure you ran <strong>npm run build</strong> before starting the server."
    );
  } else {
    res.status(404).send("404: Not found");
  }
});

io.on("connection", socket => {
  const token = socket.handshake.query.token;

  if (token) {
    admin
      .auth()
      .verifyIdToken(token)
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

  console.log(
    `[+] ${io.engine.clientsCount} client${
      io.engine.clientsCount > 1 ? "s" : ""
    } connected`
  );

  // when a user joins a room
  socket.on("joinRoom", room => {
    if (!room) return;
    if (!rooms[room]) rooms[room] = new Room();
    socket.join(room);
    setTimeout(() => {
      io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
      if (rooms[room] && rooms[room].queue)
        socket.emit("updateQueue", rooms[room].queue);
    }, 0);
  });

  socket.on("leaveRoom", room => {
    if (!room || !rooms[room]) return;
    socket.leave(room);
    io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
  });

  socket.on("disconnecting", () => {
    for (const room in socket.rooms) {
      if (socket.rooms.hasOwnProperty(room)) {
        const room2 = socket.rooms[room];
        setTimeout(() => {
          if (rooms[room2])
            io.to(room2).emit("roomUsersUpdate", getRoomUsers(room2));
        }, 0);
      }
    }
  });

  socket.on("authenticate", token => {
    if (!token) return;
    admin
      .auth()
      .verifyIdToken(token)
      .then(user => {
        if (user.email) socket.avatar = getGravatarUrl(user.email);
        if (user.name) socket.displayName = user.name;
        socket.uid = user.uid;
        for (const r in socket.rooms) {
          if (socket.rooms.hasOwnProperty(r)) {
            const room = socket.rooms[r];
            if (rooms[room])
              io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
          }
        }
      })
      .catch(console.error);
  });

  socket.on("sendPlayerStatusUpdate", (room, playerStatus) => {
    if (!room || room === "") return;
    if (!rooms[room]) rooms[room] = new Room();
    playerStatus.eventTime = new Date().getTime();
    rooms[room].playerStatus = playerStatus;
    socket.to(room).emit("playerStatusUpdate", rooms[room].playerStatus);
  });

  socket.on("addVideo", (room, videoObj, callback) => {
    if (!room || !videoObj || !videoObj.videoId) return;
    if (!rooms[room]) rooms[room] = new Room();
    // max queue size 50 entries
    if (rooms[room].queue.length > 49)
      return callback("Max queue length is 50");

    if (!videoObj.title) videoObj.title = "Video";
    // max title, source, description length
    videoObj.title = String(videoObj.title).substring(0, 100);
    videoObj.source = String(videoObj.source).substring(0, 100);
    videoObj.description = String(videoObj.description).substring(0, 250);
    // max video id length 11 characters
    videoObj.videoId = String(videoObj.videoId).substring(0, 11);
    // create a unique id for each entry
    videoObj.uid = MD5(
      videoObj.videoId + new Date().getTime().toString()
    ).toString();
    // push video object in array and send callback
    rooms[room].queue.push(videoObj);
    callback();

    if (rooms[room].queue.length === 1) {
      rooms[room].playerStatus = new PlayerStatus("play");
      io.to(room).emit("playerStatusUpdate", rooms[room].playerStatus);
    }

    io.to(room).emit("updateQueue", rooms[room].queue);
  });

  socket.on("removeVideo", (room, uid) => {
    if (!room || !uid || !rooms[room]) return;
    rooms[room].queue.forEach((video, index) => {
      if (video.uid === uid) {
        rooms[room].queue.splice(index, 1);
      }
    });
    io.to(room).emit("updateQueue", rooms[room].queue);
  });

  socket.on("moveVideo", (room, uid, position) => {
    if (!room || !uid || !rooms[room]) return;
    rooms[room].queue.forEach((video, index) => {
      if (video.uid === uid) {
        if (position > rooms[room].queue.length - 1) {
          rooms[room].queue.move2(index, rooms[room].queue.length - 1);
        } else if (position < 0) {
          rooms[room].queue.move2(index, 0);
        } else {
          rooms[room].queue.move2(index, position);
        }
      }
    });
    io.to(room).emit("updateQueue", rooms[room].queue);
  });

  socket.on("getQueue", room => {
    if (!room || !rooms[room]) return;
    io.to(socket).emit("updateQueue", rooms[room].queue);
  });

  socket.on("getPlayerStatus", (room, force = false, forceAll = false) => {
    if (!room || !rooms[room]) return;
    let newPlayerStatus = { ...{}, ...rooms[room].playerStatus };
    if (newPlayerStatus.status === "play") {
      const timeElapsed =
        (new Date().getTime() - rooms[room].playerStatus.eventTime) / 1000;
      newPlayerStatus.currentTime += timeElapsed;
    }
    newPlayerStatus.force = force;
    if (forceAll) {
      io.to(room).emit("playerStatusUpdate", newPlayerStatus);
    } else {
      socket.emit("playerStatusUpdate", newPlayerStatus);
    }
  });

  socket.on("skipVideo", room => {
    if (!room || !rooms[room]) return;
    // only skip videos every 500ms to prevent double skipping
    if (rooms[room].lastRemove + 500 > new Date().getTime()) return;

    if (rooms[room].queue.length > 0) {
      rooms[room].lastRemove = new Date().getTime();
      rooms[room].queue.shift();
      io.to(room).emit("updateQueue", rooms[room].queue);
      rooms[room].playerStatus = new PlayerStatus();
      io.to(room).emit("playerStatusUpdate", rooms[room].playerStatus);
      setTimeout(() => {
        rooms[room].playerStatus = new PlayerStatus("play");
        io.to(room).emit("playerStatusUpdate", rooms[room].playerStatus);
      }, 1000);
    }
  });

  socket.on("getRoomStatus", (roomHistory, callback) => {
    if (!roomHistory || !callback) return false;
    let roomsWithStatus = {};
    if (roomHistory.length < 1) return false;
    roomHistory.forEach(room => {
      roomsWithStatus[room] = {
        usersOnline: 0,
        queueLengh: 0,
        nowPlaying: ""
      };
      if (rooms[room]) {
        roomsWithStatus[room].usersOnline = getRoomUsers(room).length;
        roomsWithStatus[room].queueLengh = rooms[room].queue.length;
        if (rooms[room].queue.length > 0)
          roomsWithStatus[room].nowPlaying = rooms[room].queue[0].title;
      }
    });
    return callback(roomsWithStatus);
  });
});

server.listen(settings.nodeServerPort);
console.log(`Server running at: http://localhost:${settings.nodeServerPort}/`);
