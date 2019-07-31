const express = require("express");
const cors = require("cors");
const Router = require("./routes");

const server = express();

server.use(express.json());
server.use(cors());
server.use("/api", Router);

server.get("/", (req, res) => {
  res
    .status(200)
    .json({ secret: "https://www.youtube.com/watch?v=oHg5SJYRHA0" });
});

module.exports = server;
