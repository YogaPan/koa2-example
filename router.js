const router = require('koa-router')();
const bcrypt = require('bcrypt');
const mysql = require('./models/mysql.js');
const redis = require('./models/redis.js');
const mail = require('./mail.js');

// Store in MYSQL:
// `users`
// @id       primary key
// @username varchar(255) NOT NULL
// @password varchar(255) NOT NULL
// @email    varchar(255) NOT NULL
// @active   bool
//
// `notes`
// @id          primary key
// @content     varchar(255)
// @created_at  timestamp
// @updated_at  timestamp
// @uid         foriegn key REFERNCES users(id)
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

    // Return all notes belong to that user.
    ctx.body = await mysql.query(
      'SELECT * FROM `notes` WHERE `uid` = ?',
      [ userId ]
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
      'UPDATE `notes` SET `content` = ?, `updated_at` = NOW() WHERE `id` = ? AND `uid` = ?', [ newContent, noteId, userId ]
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
  .get('/api/schedule', signinRequired, async ctx => {
    const uid = ctx.session.uid;

    ctx.body = await mysql.query(
      'SELECT * FROM `schedule` WHERE `username` = ?',
      [ uid ]
    );
  })
  .post('/api/schedule', signinRequired, async ctx => {
    // TODO
    ctx.body = { message: 'Add schedule success!' };
  })
  .put('/api/schedule', signinRequired, async ctx => {
    // TODO
    ctx.body = { message: 'Change schedule success!' };
  })
  .del('/api/schedule', signinRequired, async ctx => {
    // TODO
    ctx.body = { messaeg: 'Delete schedule success!' };
  });

// Send back open data.
router
  .get('/api/toilet', signinRequired, async ctx => {
    // Get 10 toilet data.
    ctx.body = await mysql.query('SELECT * FROM toilet LIMIT 10');
  })
  .get('/api/toilet/:keyword', signinRequired, async ctx => {
    // Get toilet data by address.
    const keyword = ctx.request.params;

    ctx.body = await mysql.query(
      'SELECT * FROM `toilet` WHERE `Address` LIKE ? LIMIT 10',
      [ '%'+keyword+'%' ]
    );
  });


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

      // Success!
      if (match) {
        ctx.session.uid = result[0].id;
        ctx.body = { message: 'Sign in successfully!' };
        return;
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
    ctx.body = await mysql.query('SELECT * FROM `users`');
  })
  .get('/debug/notes', async ctx => {
    ctx.body = await mysql.query('SELECT * FROM `notes`');
  })
  .get('/debug/toilet', async ctx => {
    ctx.body = await mysql.query('SELECT * FROM `toilet` LIMIT 5');
  })
  .get('/debug/toilet/:keyword', signinRequired, async ctx => {
    const keyword = ctx.request.params;

    ctx.body = await mysql.query(
      'SELECT * FROM `toilet` WHERE `Address` LIKE ? LIMIT 10',
      [ '%'+keyword+'%' ]
    );
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
