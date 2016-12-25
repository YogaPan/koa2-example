const redis = require('redis');
const client = redis.createClient();

// Show redis connect error messages.
client.on('error', (err) => {
  console.log(`Redis Error ${err}`);
});

module.exports.set = function(key, value) {
  return new Promise((resolve, reject) => {
    client.set(key, value, err => {
      if (err)
        return reject(err);
      resolve();
    });
  });
};

module.exports.setex = function(key, expire, value) {
  return new Promise((resolve, reject) => {
    client.setex(key, expire, value, err => {
      if (err)
        return reject(err);
      resolve();
    });
  });
};

module.exports.get = function(key, expire, value) {
  return new Promise((resolve, reject) => {
    client.get(key, (err, reply) => {
      if (err)
        return reject(err);
      resolve(reply);
    });
  });
};

module.exports.del = function(key) {
  return new Promise((resolve, reject) => {
    client.del(key, err => {
      if (err)
        return reject(err);
      resolve();
    });
  });
};