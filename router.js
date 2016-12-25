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
router
  .get('/api/schedule', signinRequired, async ctx => {
    const username = ctx.session.username;

    ctx.body = await mysql.query(
      'SELECT * FROM `schedule` WHERE `username` = ?',
      [ username ]
    );
  })
  .get('/api/user', async ctx => { // garylai test 
    ctx.body = await mysql.query('SELECT * FROM User');
  });


// Account System:
// api/signin
// api/signout
// api/register
// api/verify/:token
router
  .post('/api/signin', signoutRequired, async ctx => {
    const form = {};

    form.username = ctx.request.body.username;
    form.password = ctx.request.body.password;

    const result = await mysql.query(
      'SELECT * FROM `users` WHERE `username` = ?',
      [ form.username ]
    );

    if (typeof result !== 'undefined' && result.length > 0) {
      const hash = result[0].password;
      const match = await bcrypt.compare(form.password, hash);

      // Success!
      if (match) {
        ctx.session.username = result[0].username;
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
    const form = {};

    form.username = ctx.request.body.username;
    form.password = await bcrypt.hash(ctx.request.body.password, 10);
    form.email    = ctx.request.body.email;
    form.active   = false;

    const result = await mysql.query(
      'SELECT * FROM `users` WHERE `username` = ?',
      [ form.username ]
    );

    if (typeof result !== 'undefined' && result.length > 0) {
      ctx.body = { message: 'This username has been taken.' };
    } else {
      await mysql.query('INSERT INTO `users` SET ?', form);
      const token = mail.sendActivateMail(form.email);

      redis.set(`active:${token}`, form.username);

      ctx.session.username = form.username;
      ctx.body = { message: 'Register successfully!' };
    }
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
    ctx.session.username = 'admin';
    ctx.body = { message: 'sign in successfully!' };
  })
  .get('/api/view', async ctx => {
    ctx.session.count = ctx.session.count || 0;
    ctx.session.count += 1;

    ctx.body = ctx.session.count;
  })
  .get('/api/secret', signinRequired, async ctx => {
    ctx.body = 'This is secret';
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
