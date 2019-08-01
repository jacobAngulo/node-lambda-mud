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
        shouldStop: false,
        path: "[]",
        visited: "[]"
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
  findPlayerByID(id)
    .then(player => {
      const updatedPlayer = { ...player, autopilot: 1 };
      db("players")
        .where({ id: id })
        .update(updatedPlayer)
        .then(() => {
          const repeater = async () => {
            await findPlayerByID(id)
              .then(player => {
                if (player.autopilot) {
                  console.log("running");
                  // write the science
                  axios({
                    method: "GET",
                    headers: { Authorization: `Token ${player.token}` },
                    url:
                      "https://lambda-treasure-hunt.herokuapp.com/api/adv/init"
                  })
                    .then(res => {
                      console.log(res.data);
                      setTimeout(() => {
                        axios({
                          method: "POST",
                          headers: { Authorization: `Token ${player.token}` },
                          url:
                            "https://lambda-treasure-hunt.herokuapp.com/api/adv/move",
                          data: {
                            direction: `${
                              res.data.exits[
                                Math.floor(
                                  Math.random() * res.data.exits.length
                                )
                              ]
                            }`
                          }
                        })
                          .then(res => {
                            console.log(res.data);
                            setTimeout(
                              repeater,
                              res.data.cooldown * 1000 /* new timeout */
                            );
                          })
                          .catch(error => {
                            console.log(`ERROR: ${error}`);
                            return error;
                          });
                      }, res.data.cooldown * 1000);
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
          };
          setTimeout(
            repeater,
            updatedPlayer.cooldown * 1000 /* last timeout */
          );
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

// visited: [ 0: { n : 4, s : 3, e : ?, w : 3 }, 4: {} ]
//                                                                                                  if there aren't any unvisited rooms => clear visited rooms
//  traverse:                                                                                       v
//      path ? nextDirection(path[0]) : next(random direction that doesn't point to a room in our visited rooms)
//
