const express = require("express");
const router = express.Router();
const {
  createPlayer,
  findPlayerByID,
  getPlayers,
  turnOffAutopilot,
  autoTraverse
} = require("./models");

router.post("/players", (req, res) => {
  token = req.body.token;
  if (token) {
    createPlayer(token)
      .then(newPlayer => {
        res.status(200).json(newPlayer);
      })
      .catch(error => {
        console.log(`ERROR: ${error}`);
        res.status(500).json(error);
      });
  } else {
    res.status(401).json({ message: "token must be provided" });
  }
});

router.get("/players", (req, res) => {
  getPlayers()
    .then(players => {
      res.status(200).json(players);
    })
    .catch(error => {
      console.log(`ERROR: ${error}`);
      res.status(500).json(error);
    });
});

router.post("/traverse/:id", (req, res) => {
  const id = req.params.id;
  if (id) {
    autoTraverse(id);
    res.status(200).json({ message: "traversal has commenced" });
  } else {
    res.status(402).json({ message: "no id provided" });
  }
});

router.post("/stop-auto-pilot/:id", (req, res) => {
  const id = req.params.id;
  if (id) {
    turnOffAutopilot(id);
    //   .then()
    //   .catch();
    res.status(200).json({ message: "traversal has ceased" });
  } else {
    res.status(402).json({ message: "no id provided" });
  }
});

module.exports = router;
