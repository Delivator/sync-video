const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
  pingInterval: 3000
});
const history = require("connect-history-api-fallback");
const fs = require("fs");
const admin = require("firebase-admin");
const { MD5 } = require("crypto-js");
const firebaseConfig = require("./src/firebaseConfig");
const seedrandom = require("seedrandom");
const youtubedl = require("youtube-dl");

// Check for settings files
if (!fs.existsSync("src/settings.json")) {
  console.log(
    "src/settings.json not found, (See https://github.com/Delivator/sync-video#project-setup 5.)"
  );
  process.exit(1);
} else if (!fs.existsSync("serviceAccountKey.json")) {
  console.log(
    "serviceAccountKey.json not found, (See https://github.com/Delivator/sync-video#project-setup 7.)"
  );
  process.exit(3);
}

const serviceAccount = require("./serviceAccountKey.json");
const settings = require("./src/settings.json");

// Initialize firebase admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL
});

app.use(history());
app.use(express.static("./dist"));

const db = admin.firestore();
const rooms_collection = db.collection("rooms");

// Global rooms collection
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

class Message {
  constructor(
    type = "info",
    user,
    avatar = "",
    message = "",
    timestamp = new Date().getTime()
  ) {
    this.type = type;
    this.user = user;
    this.message = message;
    this.avatar = avatar;
    this.timestamp = timestamp;
  }
}

function generateUsername(seed = Math.random()) {
  const animals =
    "🐵🐒🦍🐶🐕🐩🐺🦊🦝🐱🐈🦁🐯🐅🐆🐴🐎🦄🦓🦌🐮🐂🐃🐄🐷🐖🐗🐽🐏🐑🐐🐪🐫🦙🦒🐘🦏🦛🐭🐁🐀🐹🐰🐇🦔🦇🐻🐨🐼🦘🦡🦃🐔🐓🐣🐤🐥🐦🐧🕊🦅🦆🦢🦉🦚🦜🐸🐊🐢🦎🐍🐲🐉🦕🦖🐳🐋🐬🐟🐠🐡🦈🐙🐚🦀🦞🦐🦑🐌🦋🐛🐜🐝🐞🦗🕷🦂🦟";
  const animal = [...animals];
  let rng = seedrandom(seed);
  return `Anonymous ${animal[Math.floor(rng() * animal.length)]}`;
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

function updateUsersOnline(room, users) {
  if (!room) return;
  let doc = rooms_collection.doc(room);
  doc
    .get()
    .then(querySnapshot => {
      if (querySnapshot.exists)
        doc
          .update({
            usersOnline: users ? users : getRoomUsers(room).length
          })
          .catch(console.error);
    })
    .catch(console.error);
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

rooms_collection
  .where("public", "==", true)
  .get()
  .then(querySnapshot => {
    querySnapshot.forEach(doc => {
      if (doc.exists) updateUsersOnline(doc.id);
    });
  })
  .catch(console.error);

// Handle if the dist directory doesn't exist (App hasn't been build yet)
app.get("*", (req, res) => {
  if (!fs.existsSync("./dist")) {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(
      "404: Not found<br>If you're the host, make sure you execute <strong>npm run build</strong> before starting the server."
    );
  } else {
    res.status(404).send("404: Not found");
  }
});

io.on("connection", socket => {
  const handshakeToken = socket.handshake.query.token;
  if (handshakeToken) {
    admin
      .auth()
      .verifyIdToken(handshakeToken)
      .then(user => {
        if (user.email) socket.avatar = getGravatarUrl(user.email);
        socket.uid = user.uid;
        socket.displayName = user.name
          ? user.name
          : generateUsername(socket.handshake.address);
      })
      .catch(console.error);
  } else {
    socket.displayName = generateUsername(socket.handshake.address); // if not working, try socket.handshake.headers["x-forwarded-for"]
  }

  socket.on("disconnect", () => {
    console.log(
      `[-] ${io.engine.clientsCount} client${
        io.engine.clientsCount > 1 ? "s" : ""
      } connected`
    );
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
          if (Object.prototype.hasOwnProperty.call(socket.rooms, r)) {
            const room = socket.rooms[r];
            if (rooms[room])
              io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
          }
        }
      })
      .catch(console.error);
  });

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
      io.to(room).emit(
        "message",
        new Message("join", socket.displayName, socket.avatar)
      );
      io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
      if (rooms[room] && rooms[room].queue)
        socket.emit("updateQueue", rooms[room].queue);
      updateUsersOnline(room);
    }, 0);
  });

  socket.on("leaveRoom", room => {
    if (!room || !rooms[room]) return;
    socket.leave(room);
    io.to(room).emit(
      "message",
      new Message("leave", socket.displayName, socket.avatar)
    );
    io.to(room).emit("roomUsersUpdate", getRoomUsers(room));
    updateUsersOnline(room);
  });

  socket.on("disconnecting", () => {
    for (const room in socket.rooms) {
      if (Object.prototype.hasOwnProperty.call(socket.rooms, room)) {
        const room2 = socket.rooms[room];
        setTimeout(() => {
          if (rooms[room2]) {
            io.to(room).emit(
              "message",
              new Message("leave", socket.displayName, socket.avatar)
            );
            io.to(room2).emit("roomUsersUpdate", getRoomUsers(room2));
            updateUsersOnline(room2);
          }
        }, 0);
      }
    }
  });

  socket.on("sendPlayerStatusUpdate", (room, playerStatus) => {
    if (!room || room === "") return;
    if (!rooms[room]) rooms[room] = new Room();
    playerStatus.eventTime = new Date().getTime();
    rooms[room].playerStatus = playerStatus;
    socket.to(room).emit("playerStatusUpdate", rooms[room].playerStatus);
    switch (playerStatus.status) {
      case "pause":
        io.to(room).emit(
          "message",
          new Message(
            "pause",
            socket.displayName,
            socket.avatar,
            playerStatus.currentTime
          )
        );
        break;
      case "play":
        io.to(room).emit(
          "message",
          new Message(
            "play",
            socket.displayName,
            socket.avatar,
            playerStatus.currentTime
          )
        );
        break;
      default:
        break;
    }
  });

  socket.on("addVideo", (room, media, callback) => {
    if (!room || !media) return;
    if (!rooms[room]) rooms[room] = new Room();
    // max queue size 50 entries
    if (rooms[room].queue.length > 49)
      return callback("Max queue length is 50");

    if (!media.title) media.title = "Media";
    // max title, source, description length
    media.title = String(media.title).substring(0, 100);
    media.channel = String(media.channel).substring(0, 100);
    media.description = String(media.description).substring(0, 250);
    media.url = String(media.url);

    switch (media.source) {
      case "youtube":
        break;
      case "direct":
        break;
      case "extension":
        break;
      default:
        return;
    }

    media.duration =
      isNaN(media.duration) || media.duration < 0 ? 0.0 : media.duration;
    // create a unique id for each entry
    media.uid = MD5(media.url + new Date().getTime().toString()).toString();
    // push video object in array and send callback
    rooms[room].queue.push(media);
    callback();

    if (rooms[room].queue.length === 1) {
      rooms[room].playerStatus = new PlayerStatus();
      io.to(room).emit("playerStatusUpdate", rooms[room].playerStatus);
    }

    io.to(room).emit(
      "message",
      new Message("add", socket.displayName, socket.avatar, media.title)
    );
    io.to(room).emit("updateQueue", rooms[room].queue);
  });

  socket.on("removeVideo", (room, uid) => {
    if (!room || !uid || !rooms[room]) return;
    rooms[room].queue.forEach((video, index) => {
      if (video.uid === uid) {
        rooms[room].queue.splice(index, 1);
        io.to(room).emit(
          "message",
          new Message(
            "remove",
            socket.displayName,
            socket.avatar,
            "#" + (index + 1) + " " + video.title
          )
        );
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

  socket.on("getOnlineUsers", callback => {
    if (!callback) return false;
    return callback(io.engine.clientsCount);
  });

  socket.on("message", (room, message) => {
    if (!room || !rooms[room]) return;
    let msg = message.substring(0, 500);
    if (msg.length < 1) return;
    io.to(room).emit(
      "message",
      new Message("message", socket.displayName, socket.avatar, msg)
    );
  });

  socket.on("getYtdInfo", (url, callback) => {
    youtubedl.getInfo(url, (err, info) => {
      if (err) return callback(false);
      if (info) return callback(info);
    });
  });
});

server.listen(settings.nodeServerPort);
console.log(`Server running at: http://localhost:${settings.nodeServerPort}/`);
