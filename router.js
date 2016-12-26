const router = require('koa-router')();
const bcrypt = require('bcrypt');
const mysql = require('./models/mysql.js');
const redis = require('./models/redis.js');
const mail = require('./mail.js');

// Store in MYSQL:
// users
// @id       primary key
// @username varchar(255)
// @password varchar(255)
// @email    varchar(255)
// @active   bool
//
// notes
// @id      primary key
// @content varchar(255)
// @date    date
// @uid     foriegn key
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
    const uid = ctx.session.uid;

    // Return all notes belong to that user.
    ctx.body = await mysql.query(
      'SELECT * FROM `notes` WHERE `uid` = ?',
      [ uid ]
    );
  })
  .post('/api/notes', signinRequired, async ctx => {
    const note = {};

    note.uid     = ctx.session.uid;
    note.content = ctx.request.body.content;
    note.date    = ctx.request.body.date;

    // Add new Note to SQL.
    await mysql.query(
      'INSERT INTO `notes` SET ?', note
    );

    ctx.body = { message: 'Add note successfully!' };
  })
  .put('/api/notes/:id', signinRequired, async ctx => {
    const noteId = ctx.params.id;
    const newContent = ctx.request.body.content;

    // Update Note.
    // WARNING: THIS OPERATION IS NOT SAFE. MUST VERIFY THIS USER OWN THIS NOTE.
    await mysql.query(
      'UPDATE `notes` SET `content` = ? WHERE `id` = ?', [ newContent, noteId ]
    );


    ctx.body = { message: 'Update note successfully!' };
  })
  .del('/api/notes/:id', signinRequired, async ctx => {
    const noteId = ctx.params.id;

    // Delete note by noteId.
    // WARNING: THIS OPERATION IS NOT SAFE. MUST VERIFY THIS USER OWN THIS NOTE.
    await mysql.query(
      'DELETE FROM `notes` WHERE `id` = ?', [ noteId ]
    );

    ctx.body = { message: 'Delete note successfully!' };
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


// Account System:
// api/signin
// api/signout
// api/register
// api/verify/:token
router
  .post('/api/signin', signoutRequired, async ctx => {
    // TODO
    // 判斷是用email還是username登入
    const user = {};

    user.username = ctx.request.body.username;
    user.password = ctx.request.body.password;

    const result = await mysql.query(
      'SELECT * FROM `users` WHERE `username` = ?',
      [ user.username ]
    );

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
  .get('/api/users', async ctx => {
    ctx.body = await mysql.query('SELECT * FROM `users`');
  })
  .get('/api/signin', signoutRequired, async ctx => {
    ctx.session.uid = 999999;
    ctx.body = { message: 'sign in successfully!' };
  })
  .get('/api/view', async ctx => {
    ctx.session.count = ctx.session.count || 0;
    ctx.session.count += 1;

    ctx.body = ctx.session.count;
  })
  .get('/api/secret', signinRequired, async ctx => {
    ctx.body = { message: 'This is secret!' };
  });


async function signinRequired(ctx, next) {
  if (ctx.session.username)
    await next();
  else
    ctx.body = { message: 'You have to sign in' };
}

async function signoutRequired(ctx, next) {
  if (ctx.session.username)
    ctx.body = { message: 'You have to sign out' };
  else
    await next();
}

module.exports = router;
