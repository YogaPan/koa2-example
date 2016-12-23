const mysql  = require('mysql');
const config = require('../config.json');

const connection = mysql.createConnection(config.mysql);

connection.connect((err) => {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }

  console.log('connected as id ' + connection.threadId);
});

module.exports.query = function(queryString, data) {
  data = data || {}; // data is optional parameter.

  return new Promise((resolve, reject) => {
    connection.query(queryString, data, (err, rows, fields) => {
      if (err) reject(err);

      resolve(rows);
    });
  });
};
