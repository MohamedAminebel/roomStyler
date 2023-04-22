"use strict";

const fs = require('fs');
const Sqlite = require('better-sqlite3');

let db = new Sqlite('furniture.sqlite');

let load = function (filename) {
  const furniture = JSON.parse(fs.readFileSync(filename));

  // Create furniture table if it does not exist
  db.prepare('DROP TABLE IF EXISTS furniture').run();
  const furnitureTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='furniture'").get();
  if (!furnitureTableExists) {
    db.prepare('CREATE TABLE furniture (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price INTEGER, availability TEXT, image TEXT, room_type TEXT, url TEXT)').run();
  }

  // Insert furniture data
  let insertFurniture = db.prepare('INSERT INTO furniture (name, price, availability, image, room_type, url) VALUES (@name, @price, @availability, @image, @room_type, @url)');

  for (let item of furniture) {
    insertFurniture.run({ name: item.name, price: item.price, availability: item.availability, image: item.image, room_type: item.room_type, url: item.url });
  }

  // Create users table if it does not exist
  const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

  if (!usersTableExists) {
    db.prepare('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, password TEXT)').run();
  }

  // Insert default user (if not exists)
  let existingUser = db.prepare("SELECT id FROM users WHERE name = ? AND password = ?").get('admin', 'admin');
  if (!existingUser) {
    db.prepare("INSERT INTO users (name, password) VALUES ('admin', 'admin')").run();
  }
};

load('furniture.json');

module.exports = {
  load
};
