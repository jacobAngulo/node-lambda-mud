const db = require("./data/dbConfig");
const axios = require("axios");

module.exports = {
  createPlayer,
  getPlayers,
  findPlayerByID,
  turnOffAutopilot,
  autoTraverse
};

String.prototype.count = function(c) {
  var result = 0,
    i = 0;
  for (i; i < this.length; i++) if (this[i] == c) result++;
  return result;
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
        map: "{}",
        encumbrance: data.encumbrance,
        strength: data.strength,
        speed: data.speed,
        gold: data.gold,
        cooldown: data.cooldown,
        autopilot: false,
        shouldStop: false,
        shouldLoot: false,
        shouldMine: false,
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
                  axios({
                    method: "GET",
                    headers: { Authorization: `Token ${player.token}` },
                    url:
                      "https://lambda-treasure-hunt.herokuapp.com/api/adv/init"
                  })
                    .then(res => {
                      setTimeout(() => {
                        let { items } = res.data;
                        const prevRoomID = res.data.room_id;
                        const prevRoomExits = res.data.exits;
                        const prevRoomTitle = res.data.title;
                        let prevRoomCoordinates = JSON.stringify(
                          res.data.coordinates
                        );
                        prevRoomCoordinates = prevRoomCoordinates.replace(
                          "(",
                          "["
                        );
                        prevRoomCoordinates = prevRoomCoordinates.replace(
                          ")",
                          "]"
                        );
                        const opposites = {
                          n: "s",
                          e: "w",
                          s: "n",
                          w: "e"
                        };
                        let map = JSON.parse(player.map);
                        let path = JSON.parse(player.path);
                        let visited = JSON.parse(player.visited);

                        if (!(prevRoomID in visited)) {
                          visited[prevRoomID] = {
                            title: prevRoomTitle,
                            exits: {},
                            coordinates: JSON.parse(prevRoomCoordinates)
                          };

                          prevRoomExits.forEach(exit => {
                            visited[prevRoomID]["exits"][exit] = "?";
                          });
                        }

                        const determineNextExit = () => {
                          if (path.length) {
                            console.log(path[0]);
                            return path.shift();
                          } else {
                            let undiscovered = [];

                            prevRoomExits.forEach(exit => {
                              if (visited[prevRoomID]["exits"][exit] === "?") {
                                undiscovered.push(exit);
                              }
                            });

                            if (undiscovered.length) {
                              return undiscovered[
                                Math.floor(Math.random() * undiscovered.length)
                              ];
                            } else {
                              let queue = [];
                              let revisited_rooms = [];
                              let availablePath = false;
                              let currentRoomID = prevRoomID;
                              queue.push([]);

                              while (!availablePath) {
                                let backTrackPath = queue.shift();
                                backTrackPath.forEach(direction => {
                                  if (
                                    visited[currentRoomID]["exits"][
                                      direction
                                    ] === "?"
                                  ) {
                                    path = backTrackPath;
                                    availablePath = true;
                                  } else {
                                    currentRoomID =
                                      visited[currentRoomID]["exits"][
                                        direction
                                      ];
                                  }
                                });

                                Object.keys(
                                  visited[currentRoomID]["exits"]
                                ).forEach(direction => {
                                  if (
                                    !revisited_rooms.includes(
                                      visited[currentRoomID]["exits"][direction]
                                    )
                                  ) {
                                    revisited_rooms.push(
                                      visited[currentRoomID]["exits"][direction]
                                    );
                                    queue.push([...backTrackPath, direction]);
                                  }
                                });
                                currentRoomID = prevRoomID;
                              }
                              console.log("backtrack path:", path);
                              return path.shift(0);
                            }
                          }
                        };

                        const nextDirection = determineNextExit();

                        console.log(`moving ${nextDirection}`);

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
                            let {
                              room_id,
                              coordinates,
                              exits,
                              title,
                              items,
                              cooldown
                            } = res.data;

                            coordinates = JSON.stringify(coordinates);

                            coordinates = coordinates.replace("(", "[");
                            coordinates = coordinates.replace(")", "]");

                            if (room_id in visited) {
                              visited[room_id]["exits"][
                                opposites[nextDirection]
                              ] = prevRoomID;
                            } else {
                              visited[room_id] = {
                                title: title,
                                exits: {},
                                coordinates: JSON.parse(coordinates)
                              };

                              exits.forEach(exit => {
                                if (exit === opposites[nextDirection]) {
                                  visited[room_id]["exits"][exit] = prevRoomID;
                                } else {
                                  visited[room_id]["exits"][exit] = "?";
                                }
                              });
                            }

                            visited[prevRoomID]["exits"][
                              nextDirection
                            ] = room_id;

                            if (
                              JSON.stringify(map).count("?") >
                                JSON.stringify(visited).count("?") ||
                              JSON.stringify(map).length <
                                JSON.stringify(visited).length
                            ) {
                              console.log("updating map");
                              map = { ...visited };
                            }

                            console.log(Object.keys(map));

                            await db("players")
                              .where({ id: player.id })
                              .update({
                                ...player,
                                path: JSON.stringify(path),
                                map: JSON.stringify(map),
                                visited: JSON.stringify(visited)
                              });

                            setTimeout(
                              repeater,
                              cooldown * 1000 /* new timeout */
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
