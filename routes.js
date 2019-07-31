const express = require("express");
const router = express.Router();
const { createPlayer, findPlayerByID } = require("./models");

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

module.exports = router;
