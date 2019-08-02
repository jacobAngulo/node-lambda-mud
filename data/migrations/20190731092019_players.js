exports.up = function(knex) {
  return knex.schema.createTable("players", player => {
    player.increments();
    player.string("token").unique();
    player.string("name");
    player.string("map");
    player.integer("encumbrance");
    player.integer("strength");
    player.integer("speed");
    player.integer("gold");
    player.integer("cooldown");
    player.boolean("autopilot");
    player.boolean("shouldStop");
    player.boolean("shouldLoot");
    player.boolean("shouldMine");
    player.string("path");
    player.string("visited");
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists("players");
};

// winsound.Beep(freq, dur)
