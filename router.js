const router = require('koa-router')();
const bcrypt = require('bcrypt');
const mysql = require('./models/mysql.js');
const redis = require('./models/redis.js');
const mail = require('./mail.js');

// Store in MYSQL:
// `users`
// @id          primary key
// @username    varchar(255)
// @password    varchar(255)
// @email       varchar(255)
// @active      bool
//
// `notes`
// @id          primary key
// @content     varchar(255)
// @created_at  timestamp
// @updated_at  timestamp
// @uid         foreign key REFERENCES users(id)
//
// `schedules`
// @id          primary key
// @name        varchar(255)
// @start       timestamp
// @uid         foreign key REFERENCES users(id)
//
// `paths`
// @id          primary key
// @name        varchar(255)
// @lat         double
// @lng         double
// @address     varchar(255)
// @arrive_time timestamp
// @sid         foriegn key REFERENCES schedules(id)
//
// `share`
// @id          primary key
// @uid1        foriegn key REFERENCES users(id)
// @uid2        foriegn key REFERENCES users(id)
//
//
// `toilet`
// @Number      primary key
// @Latitude    double
// @Longitude   double
// @Name        varchar(20)
// @Address     varchar(30)
// @Type        varchar(20)
// @Grade       varchar(5)
//
// Store in Redis:
// tokens
// active:<token> -> <username>
//
// session
// koa:sess:<token> -> <json data>


// Restful router. CRUD:
// GET  -> read
// POST -> create
// PUT  -> update
// DEL  -> delete

// Notes
router
  .get('/api/notes', signinRequired, async ctx => {
    const userId = ctx.session.uid;
    const query = ctx.query;

    // Return all notes belong to that user.
    if (Object.keys(query).length === 0) {
      return ctx.body = await mysql.query(
        'SELECT * FROM `notes` WHERE `uid` = ?',
        [ userId ]
      );
    }

    // Return notes by content.
    if (Object.prototype.hasOwnProperty.call(query, 'content')) {
      return ctx.body = await mysql.query(
        'SELECT * FROM `notes` WHERE content LIKE ? AND `uid` = ? LIMIT 10',
        [ '%'+query.content+'%', userId ]
      );
    }

    // Invalid Query.
    ctx.body = { message: 'Invalid Query' };
  })
  .get('/api/notes/:id', signinRequired, async ctx => {
    const userId = ctx.session.uid;

    // Return notes by id.
    ctx.body = await mysql.query(
      'SELECT * FROM `notes` WHERE `uid` = ? AND `id` = ?',
      [ userId, noteId ]
    );
  })
  .post('/api/notes', signinRequired, async ctx => {
    const note = {};

    note.uid     = ctx.session.uid;
    note.content = ctx.request.body.content;

    // Add new Note to SQL.
    await mysql.query('INSERT INTO `notes` SET ?', note);
    ctx.body = { message: 'Add note successfully!' };
  })
  .put('/api/notes/:id', signinRequired, async ctx => {
    const userId = ctx.session.uid;
    const noteId = ctx.params.id;
    const newContent = ctx.request.body.content;

    await mysql.query(
      'UPDATE `notes` SET `content` = ?, `updated_at` = NOW() WHERE `id` = ? AND `uid` = ?',
      [ newContent, noteId, userId ]
    );

    ctx.body = { message: 'Update note successfully!' };
  })
  .del('/api/notes/:id', signinRequired, async ctx => {
    const userId = ctx.session.uid;
    const noteId = ctx.params.id;

    await mysql.query('DELETE FROM `notes` WHERE `id` = ? AND `uid` = ?', [ noteId, userId ]);
    ctx.body = { message: 'Delete successfully!' };
  });

// Schedules
router
  .get('/api/schedules', signinRequired, async ctx => {
    const userId = ctx.session.uid;

    const result = await mysql.query(
      `SELECT * FROM schedules WHERE uid = ?`, [ userId ]
    );

    for (let i = 0; i < result.length; i++) {
      const result2 = await mysql.query(
        `SELECT * FROM paths WHERE sid = ?`, [ result[i].id ]
      );

      result[i].path = result2;
    }

    ctx.body = result;
  })
  .post('/api/schedules', signinRequired, async ctx => {
    const newSchedule = {
      uid:   ctx.session.uid,
      name:  decodeURIComponent(ctx.request.body.name),
      start: ctx.request.body.start,
    };

    // Insert new schedule into database.
    await mysql.query('INSERT INTO `schedules` SET ?', newSchedule);
    ctx.body = { message: 'Add schedule success!' };
  })
  .post('/api/paths', signinRequired, async ctx => {
    const newPath = {
      sid: ctx.request.body.sid,
      name: decodeURIComponent(ctx.request.body.name),
      lat: ctx.request.body.lat,
      lng: ctx.request.body.lng,
      address: decodeURIComponent(ctx.request.body.address),
      arrive_time: ctx.request.body.arrive_time,
    };

    await mysql.query('INSERT INTO paths SET ?', newPath);
    ctx.body = { message: 'Add path success!!' };
  })
  .put('/api/schedule/:id', signinRequired, async ctx => {
    const userId = ctx.session.uid;
    const { name, address, lat, lng } = ctx.request.body;

    await mysql.query(
      'UPDATE `schedules` SET name = ?, address = ?, lat = ?, lng = ?  WHERE `id` = ? `uid` = ?',
      [ name, address, lat, lng, scheduleId, userId ]
    );

    ctx.body = { message: 'Change schedule success!' };
  })
  .del('/api/schedules/:id', signinRequired, async ctx => {
    const scheduleId = ctx.params.id;

    await mysql.query('DELETE FROM paths WHERE sid = ?', [ scheduleId ]);
    await mysql.query('DELETE FROM schedules WHERE id = ?', [ scheduleId ]);

    ctx.body = { messaeg: 'Delete schedule success!' };
  })
  .del('/api/paths/:id', signinRequired, async ctx => {
    const pathId = ctx.params.id;

    await mysql.query('DELETE FROM paths WHERE id = ?', [ pathId ]);
    ctx.body = { message: 'Delete path success!' };
  });

// Send back open data.
router
  .get('/api/toilet', signinRequired, async ctx => {
    // Check query string format.
    // Correct example: /api/toilet?lat=127.321&lng=21.4512
    if (Object.keys(ctx.query).length !== 2) {
      return ctx.body = { message: 'Wrong querystring.' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lat') === false) {
      return ctx.body = { message: 'Missing querystring "lat".' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lng') === false) {
      return ctx.body = { message: 'Missing querystring "lng".' };
    }

    const { lat, lng } = ctx.query;
    ctx.body = await mysql.query(
      `
      SELECT
        *, (
          6371 * 1000 * acos (
            cos ( radians( ? ) )
            * cos( radians( Latitude ) )
            * cos( radians( Longitude ) - radians( ? ) )
            + sin ( radians( ? ) )
            * sin( radians( Latitude ) )
          )
        ) AS distance
      FROM toilet
      HAVING distance < 5 * 1000
      ORDER BY distance
      LIMIT 0 , 20;
      `,
      [ lat, lng, lat ]
    );
  })
  .get('/api/hotel', signinRequired, async ctx => {
    // Check query string format.
    // Correct example: /api/toilet?lat=127.321&lng=21.4512
    if (Object.keys(ctx.query).length !== 2) {
      return ctx.body = { message: 'Wrong querystring.' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lat') === false) {
      return ctx.body = { message: 'Missing querystring "lat".' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lng') === false) {
      return ctx.body = { message: 'Missing querystring "lng".' };
    }

    const { lat, lng } = ctx.query;
    ctx.body = await mysql.query(
      `
      SELECT
        *, (
          6371 * 1000 * acos (
            cos ( radians( ? ) )
            * cos( radians( Latitude ) )
            * cos( radians( Longitude ) - radians( ? ) )
            + sin ( radians( ? ) )
            * sin( radians( Latitude ) )
          )
        ) AS distance
      FROM hotel
      HAVING distance < 25 * 1000
      ORDER BY distance
      LIMIT 0 , 20;
      `,
      [ lat, lng, lat ]
    );
  })
  .get('/api/attraction', signinRequired, async ctx => {
    // Check query string format.
    // Correct example: /api/toilet?lat=127.321&lng=21.4512
    if (Object.keys(ctx.query).length !== 2) {
      return ctx.body = { message: 'Wrong querystring.' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lat') === false) {
      return ctx.body = { message: 'Missing querystring "lat".' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lng') === false) {
      return ctx.body = { message: 'Missing querystring "lng".' };
    }

    const { lat, lng } = ctx.query;
    ctx.body = await mysql.query(
      `
      SELECT
        *, (
          6371 * 1000 * acos (
            cos ( radians( ? ) )
            * cos( radians( Latitude ) )
            * cos( radians( Longitude ) - radians( ? ) )
            + sin ( radians( ? ) )
            * sin( radians( Latitude ) )
          )
        ) AS distance
      FROM attraction
      HAVING distance < 25 * 1000
      ORDER BY distance
      LIMIT 0 , 20;
      `,
      [ lat, lng, lat ]
    );
  })


// Account System:
// api/signin
// api/signout
// api/register
// api/verify/:token
router
  .post('/api/signin', signoutRequired, async ctx => {
    const user = {};
    let result;

    user.password = ctx.request.body.password;

    // Check use email or username.
    if (/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(ctx.request.body.username) === true) {
      user.email = ctx.request.body.username;
      result = await mysql.query(
        'SELECT * FROM `users` WHERE `email` = ?',
        [ user.email ]
      );
    } else {
      user.username = ctx.request.body.username;
      result = await mysql.query(
        'SELECT * FROM `users` WHERE `username` = ?',
        [ user.username ]
      );
    }

    if (typeof result !== 'undefined' && result.length > 0) {
      const hash = result[0].password;
      const match = await bcrypt.compare(user.password, hash);

      if (match) {
        // Success!
        if (result[0].active === 1)
          ctx.session.uid = result[0].id;
          return ctx.body = { message: 'Sign in successfully!' };
        else
          return ctx.body = { message: 'You have to active your account!' };
      }
    }
    // Failed!
    ctx.body = { message: 'Sign in Failed. Uncorrect username or password.' };
  })
  .get('/api/signout', signinRequired, async ctx => {
    ctx.session = null;
    ctx.body = { message: 'sign out successfully!' };
  })
  .post('/api/register', signoutRequired, async ctx => {
    const newUser = {};

    newUser.username = ctx.request.body.username;
    newUser.password = await bcrypt.hash(ctx.request.body.password, 10);
    newUser.email    = ctx.request.body.email;
    newUser.active   = false;

    // Check is email format valid.
    if (/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(newUser.email) === false) {
      return ctx.body = { message: 'invalid email address.' };
    }

    // Check is username has been taken.
    const usernameResult = await mysql.query(
      'SELECT * FROM `users` WHERE `username` = ?',
      [ newUser.username ]
    );
    if (typeof usernameResult !== 'undefined' && usernameResult.length > 0) {
      return ctx.body = { message: 'This username has been taken.' };
    }

    // Check is email has been taken.
    const emailResult = await mysql.query(
      'SELECT * FROM `users` WHERE `email` = ?',
      [ newUser.email ]
    );
    if (typeof emailResult !== 'undefined' && emailResult.length > 0) {
      return ctx.body = { message: 'This email has been taken.' };
    }

    await mysql.query('INSERT INTO `users` SET ?', newUser);
    const token = mail.sendActivateMail(newUser.email);

    // Store token into redis cache.
    redis.set(`active:${token}`, newUser.username);

    // Auto login after register success.
    ctx.session.uid = newUser.uid;
    ctx.body = { message: 'Register successfully!' };
  })
  .get('/verify/:token', async ctx => {
    const token = 'active:' + ctx.params.token;
    const username = await redis.get(token);

    // Invalid Token.
    if (username === null) {
      return ctx.body = { message: 'Invalid Token!' };
    }

    // Delete verify token.
    redis.del(token);

    // Activation user.
    await mysql.query('UPDATE `users` SET `active` = true WHERE `username` = ?', [ username ]);

    ctx.body = { message: 'verify successfully!' };
  });


// WARNING!! DO NOT TOUCH THIS!
// This route is used to DEBUG. Used by yogapan.
router
  .get('/debug/users', async ctx => {
    const query = ctx.query;

    // Return all users.
    if (Object.keys(query).length === 0) {
      return ctx.body = await mysql.query('SELECT * FROM `users` LIMIT 10');
    }

    // Return users search by username.
    if (Object.prototype.hasOwnProperty.call(query, 'username')) {
      return ctx.body = await mysql.query(
        'SELECT * FROM `users` WHERE `username` LIKE ? LIMIT 10',
        [ '%'+query.username+'%' ]
      );
    }

    ctx.body = { message: 'Invalid Query.' };
  })
  .get('debug/users/:id', async ctx => {
    const userId = ctx.params.id;
    ctx.body = await mysql.query('SELECT * FROM `users` WHERE id = ?', [ userId ]);
  })
  .get('/debug/notes', async ctx => {
    const query = ctx.query;

    if (Object.keys(query).length === 0) {
      return ctx.body = await mysql.query('SELECT * FROM `notes` LIMIT 10');
    }

    if (Object.prototype.hasOwnProperty.call(query, 'content')) {
      return ctx.body = await mysql.query(
        'SELECT * FROM `notes` WHERE content LIKE ? LIMIT 10',
        [ '%'+query.content+'%' ]
      );
    }

    ctx.body = { message: 'Invalid Query.' };
  })
  .get('/debug/notes/:id', async ctx => {
    const noteId = ctx.params.id;
    ctx.body = await mysql.query('SELECT * FROM `notes` WHERE `id` = ?', [ noteId ]);
  })
  .get('/debug/schedules', async ctx => {
    ctx.body = await mysql.query('SELECT * FROM `schedules`');
  })
  .get('/debug/schedules/:id', async ctx => {
    const scheduleId = ctx.params.id;

    ctx.body = await mysql.query(
      'SELECT * FROM `schedules` WHERE `id` = ?',
      [ scheduleId ]
    );
  })
  .get('/debug/paths', async ctx => {
    ctx.body = await mysql.query('SELECT * FROM paths');
  })
  .get('/debug/toilet', async ctx => {
    // Check query string format.
    // Correct example: /debug/toilet?lat=127.321&lng=21.4512
    if (Object.keys(ctx.query).length !== 2) {
      return ctx.body = { message: 'Wrong querystring.' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lat') === false) {
      return ctx.body = { message: 'Missing querystring "lat".' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lng') === false) {
      return ctx.body = { message: 'Missing querystring "lng".' };
    }

    const { lat, lng } = ctx.query;
    ctx.body = await mysql.query(
      `
      SELECT
        *, (
          6371 * 1000 * acos (
            cos ( radians( ? ) )
            * cos( radians( Latitude ) )
            * cos( radians( Longitude ) - radians( ? ) )
            + sin ( radians( ? ) )
            * sin( radians( Latitude ) )
          )
        ) AS distance
      FROM toilet
      HAVING distance < 5 * 1000
      ORDER BY distance
      LIMIT 0 , 20;
      `,
      [ lat, lng, lat ]
    );
  })
  .get('/debug/hotel', async ctx => {
    // Check query string format.
    // Correct example: /debug/toilet?lat=127.321&lng=21.4512
    if (Object.keys(ctx.query).length !== 2) {
      return ctx.body = { message: 'Wrong querystring.' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lat') === false) {
      return ctx.body = { message: 'Missing querystring "lat".' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lng') === false) {
      return ctx.body = { message: 'Missing querystring "lng".' };
    }

    const { lat, lng } = ctx.query;
    ctx.body = await mysql.query(
      `
      SELECT
        *, (
          6371 * 1000 * acos (
            cos ( radians( ? ) )
            * cos( radians( Latitude ) )
            * cos( radians( Longitude ) - radians( ? ) )
            + sin ( radians( ? ) )
            * sin( radians( Latitude ) )
          )
        ) AS distance
      FROM hotel
      HAVING distance < 25 * 1000
      ORDER BY distance
      LIMIT 0 , 20;
      `,
      [ lat, lng, lat ]
    );
  })
  .get('/debug/attraction', async ctx => {
    // Check query string format.
    // Correct example: /debug/toilet?lat=127.321&lng=21.4512
    if (Object.keys(ctx.query).length !== 2) {
      return ctx.body = { message: 'Wrong querystring.' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lat') === false) {
      return ctx.body = { message: 'Missing querystring "lat".' };
    }
    if (Object.prototype.hasOwnProperty.call(ctx.query, 'lng') === false) {
      return ctx.body = { message: 'Missing querystring "lng".' };
    }

    const { lat, lng } = ctx.query;
    ctx.body = await mysql.query(
      `
      SELECT
        *, (
          6371 * 1000 * acos (
            cos ( radians( ? ) )
            * cos( radians( Latitude ) )
            * cos( radians( Longitude ) - radians( ? ) )
            + sin ( radians( ? ) )
            * sin( radians( Latitude ) )
          )
        ) AS distance
      FROM attraction
      HAVING distance < 25 * 1000
      ORDER BY distance
      LIMIT 0 , 20;
      `,
      [ lat, lng, lat ]
    );
  })
  .get('/debug/toilet/:id', async ctx => {
    const toiletId = ctx.params.id;
    ctx.body = await mysql.query('SELECT * FROM `toilet` WHERE `Number` = ?', [ toiletId ]);
  })
  .get('/debug/secret', signinRequired, async ctx => {
    ctx.body = { message: 'This is secret!' };
  });


async function signinRequired(ctx, next) {
  if (ctx.session.uid)
    await next();
  else
    ctx.body = { message: 'You have to sign in' };
}

async function signoutRequired(ctx, next) {
  if (ctx.session.uid)
    ctx.body = { message: 'You have to sign out' };
  else
    await next();
}

module.exports = router;
