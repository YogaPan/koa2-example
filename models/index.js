var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'Zk$8hLn',
  database : 'test'
});

connection.connect((err) => {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }

  console.log('connected as id ' + connection.threadId);
});

module.exports = {
  query: (queryString, data) => {
    data = data || {}; // data is optional parameter.

    return new Promise((resolve, reject) => {
      connection.query(queryString, data, (err, rows, fields) => {
        if (err) reject(err);

        resolve(rows);
      });
    });
  },
};
