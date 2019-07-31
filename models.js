const db = require("./data/dbConfig");
const axios = require("axios");

module.exports = {
  createPlayer,
  getPlayers,
  findPlayerByID,
  turnOffAutopilot,
  autoTraverse
};

function createPlayer(token) {
  return axios({
    method: "POST",
    headers: { Authorization: `Token ${token}` },
    url: "https://lambda-treasure-hunt.herokuapp.com/api/adv/status"
  })
    .then(res => {
      const data = res.data;
      player = {
        token: token,
        name: data.name,
        map: "[]",
        encumbrance: data.encumbrance,
        strength: data.strength,
        speed: data.speed,
        gold: data.gold,
        cooldown: data.cooldown,
        autopilot: false,
        path: "[]"
      };
      return db("players")
        .insert(player)
        .returning("id")
        .then(([id]) => {
          return findPlayerByID(id);
        })
        .catch(error => {
          console.log(`ERROR: ${error}`);
          return error;
        });
    })
    .catch(error => {
      console.log(`ERROR: ${error}`);
      return error;
    });
}

function getPlayers() {
  return db("players");
}

function findPlayerByID(id) {
  return db("players")
    .where({ id: id })
    .first();
}

function turnOffAutopilot(id) {
  return findPlayerByID(id)
    .then(player => {
      const updatedPlayer = { ...player, autopilot: 0 };
      db("players")
        .where({ id: id })
        .update(updatedPlayer)
        .then()
        .catch();
    })
    .catch(error => {
      console.log(`ERROR: ${error}`);
      return error;
    });
}

function autoTraverse(id) {
  console.log("here", id);
  findPlayerByID(id)
    .then(player => {
      console.log(player);
      const updatedPlayer = { ...player, autopilot: 1 };
      console.log(updatedPlayer);
      db("players")
        .where({ id: id })
        .update(updatedPlayer)
        .then(() => {
          while (true) {
            findPlayerByID(id)
              .then(player => {
                if (player.autopilot) {
                  setTimeout(() => {
                    console.log("running");
                  }, player.cooldown * 1000);
                } else {
                  console.log("Break");
                  Break;
                }
              })
              .catch(error => {
                console.log(`ERROR: ${error}`);
                return error;
              });
          }
        })
        .catch(error => {
          console.log(`ERROR: ${error}`);
          return error;
        });
    })
    .catch(error => {
      console.log(`ERROR: ${error}`);
      return error;
    });
}

// { 0: { n : 4, s : 3, e : 2, w : 3 }, 4: {} }

//                                                                                                  | if there aren't any unvisited rooms => clear visited rooms
//  traverse:                                                                                       v
//      path ? nextDirection(path[0]) : next(random direction that doesn't point to a room in our visited rooms)
//
//
//
