const Database = require("better-sqlite3");

const db = new Database("fila3d.sqlite");

module.exports = db;