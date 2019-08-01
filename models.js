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
        visited: "{}"
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
                  axios({
                    method: "GET",
                    headers: { Authorization: `Token ${player.token}` },
                    url:
                      "https://lambda-treasure-hunt.herokuapp.com/api/adv/init"
                  })
                    .then(res => {
                      // console.log("last room???????", res.data);
                      setTimeout(() => {
                        const prevRoomID = res.data.room_id;
                        const prevRoomExits = res.data.exits;
                        let map = JSON.parse(player.map);
                        let path = JSON.parse(player.path);
                        let visited = JSON.parse(player.visited);

                        if (!(prevRoomID in visited)) {
                          visited[prevRoomID] = {};

                          prevRoomExits.forEach(exit => {
                            visited[prevRoomID][exit] = "?";
                          });
                        }

                        const determineNextExit = () => {
                          if (path.length) {
                            // return path.unshift();
                          } else {
                          }

                          return Math.floor(
                            Math.random() * res.data.exits.length
                          );
                        };

                        const nextDirection =
                          res.data.exits[determineNextExit()];

                        axios({
                          method: "POST",
                          headers: { Authorization: `Token ${player.token}` },
                          url:
                            "https://lambda-treasure-hunt.herokuapp.com/api/adv/move",
                          data: {
                            direction: nextDirection
                          }
                        })
                          .then(async res => {
                            const { room_id } = res.data;
                            // console.log(res.data);
                            const opposites = {
                              n: "s",
                              e: "w",
                              s: "n",
                              w: "e"
                            };
                            if (room_id in visited) {
                              visited[room_id][
                                opposites[nextDirection]
                              ] = prevRoomID;
                            } else {
                              visited[room_id] = {};

                              res.data.exits.forEach(exit => {
                                if (exit === opposites[nextDirection]) {
                                  visited[room_id][exit] = prevRoomID;
                                } else {
                                  visited[room_id][exit] = "?";
                                }
                              });
                            }
                            visited[prevRoomID][nextDirection] = room_id;

                            await db("players")
                              .where({ id: player.id })
                              .update({
                                ...player,
                                path: JSON.stringify(path),
                                map: JSON.stringify(map),
                                visited: JSON.stringify(visited)
                              });

                            console.log(
                              await db("players")
                                .select("visited")
                                .where({
                                  id: player.id
                                })
                            );

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
