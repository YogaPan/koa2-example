const router = require('koa-router')();
const conn = require('./models/index.js'); // MySQL connection.

// Restful router. CRUD:
// GET  -> read
// POST -> create
// PUT  -> update
// DEL  -> delete
router
  .get('/schedule', async ctx => {
    const username = ctx.session.username;

    ctx.body = await conn.query(
      'SELECT * FROM `schedule` WHERE `username` = ?',
      [ username ]
    );
  })
  .get('/api/user', async ctx => { // garylai test 
    ctx.body = await conn.query('SELECT * FROM User');
  });

// User signin signout and register.
router
  .post('/api/signin', signoutRequired, async ctx => {
    const form = {};

    form.username = ctx.request.body.username;
    form.password = ctx.request.body.password;

    const result = await conn.query(
      'SELECT * FROM `users` WHERE `username` = ? AND `password` = ?',
      [ form.username, form.password ]
    );

    if (typeof result !== 'undefined' && result.length > 0) {
      ctx.session.username = result[0].username;
      ctx.body = { message: 'Sign in successfully!' };
    } else {
      ctx.body = { message: 'Sign in Failed. Uncorrect username or password.' };
    }
  })
  .get('/api/signout', signinRequired, async ctx => {
    ctx.session = null;
    ctx.body = { message: 'sign out successfully!' };
  })
  .post('/api/register', signoutRequired, async ctx => {
    // TODO
    // - Password need MD5 hash and add salt to encrypt.
    const form = {};

    form.username = ctx.request.body.username;
    form.password = ctx.request.body.password;

    const result = await conn.query(
      'SELECT * FROM `users` WHERE `username` = ?',
      [ form.username ]
    );

    if (typeof result !== 'undefined' && result.length > 0) {
      ctx.body = { message: 'This username has been taken.' };
    } else {
      await conn.query('INSERT INTO `users` SET ?', form);
      ctx.session.username = form.username;
      ctx.body = { message: 'Register successfully!' };
    }
  });

// WARNING!! DO NOT TOUCH THIS!
// This route is used to DEBUG session. Used by yogapan.
router
  .get('/api/users', async ctx => {
    ctx.body = await conn.query('SELECT * FROM `users`');
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
