"use strict";

const Sqlite = require('better-sqlite3');

let db = new Sqlite('furniture.sqlite');
const createDb = require('./create-db');
createDb.load('furniture.json');

exports.read = (room_type) => {
  let found = db.prepare('SELECT * FROM furniture WHERE room_type = ?').get(room_type);
  if (found !== undefined) {
    return found;
  } else {
    return null;
  }
};

exports.search = (query, page, roomType) => {
  const num_per_page = 32;
  query = query || "";
  page = parseInt(page || 1);
  roomType = roomType || "";

  let num_found = db.prepare('SELECT count() FROM furniture WHERE name LIKE ? AND room_type = ?').get('%' + query + '%', roomType)['count()'];
  let results = db.prepare('SELECT id as entry, name, price, availability, image, room_type, url FROM furniture WHERE name LIKE ? AND room_type = ? ORDER BY id LIMIT ? OFFSET ?').all('%' + query + '%', roomType, num_per_page, (page - 1) * num_per_page);

  return {
    results: results,
    num_found: num_found,
    query: query,
    next_page: page + 1,
    page: page,
    num_pages: parseInt(num_found / num_per_page) + 1,
  };
};


exports.login = function (user, password) {
  let result = db.prepare('SELECT id FROM users WHERE name = ? AND password = ?').get(user, password);
  if (result === undefined) return -1;
  return result.id;
}

exports.new_user = function (user, password) {
  const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

  if (!usersTableExists) {
    // Create the users table if it does not exist
    db.prepare('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, password TEXT)').run();
  }
  let result = db.prepare('INSERT INTO users (name, password) VALUES (?, ?)').run(user, password);
  return result.lastInsertRowid;

}
console.log("All furniture records:");
console.log(db.prepare('SELECT * FROM furniture').all());
