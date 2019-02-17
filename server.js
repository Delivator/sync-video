const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

app.use(express.static("public"));
app.set("views", "views");
app.set("view engine", "ejs");

io.on("connection", (socket) => {
  // when a new socket connects
});

app.get("/", (req, res) => {
  res.render("pages/index");
});

server.listen(3000);
console.log("Webserver running under http://localhost:3000/");