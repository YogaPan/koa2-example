const router = require('koa-router')();
const conn = require('./models/index.js'); // MySQL connection.

// Restful router. CRUD:
// GET -> read
// POST -> create
// PUT -> update
// DEL -> delete
router
  .get('/api/members', async ctx => {
    ctx.body = await conn.query('SELECT * FROM Members');
  })
  .post('/api/members', async ctx => {
    await conn.query('INSERT INTO Members SET ?', ctx.request.body);
    ctx.body = { message: 'insert data successfully!' };
  })
  .put('/api/members', async ctx => {
    // TODO
  })
  .del('/api/members', async ctx => {
    // TODO
  })
  .get('/api/user', async ctx => { // garylai test 
    ctx.body = await conn.query('SELECT * FROM User');
  });

// User sign in and sign out.
router
  .get('/api/signin', signoutRequired, async ctx => {
    // TODO
    // - Query Database.
    // - Signin successfully.
    // - Signin failed.
    ctx.session.username = 'admin';
    ctx.body = { message: 'sign in successfully!' };
  })
  .get('/api/signout', signinRequired, async ctx => {
    ctx.session = null;
    ctx.body = { message: 'sign out successfully!' };
  })
  .get('/api/register', signoutRequired, async ctx => {
    // TODO
    // - Insert data to database.
    // - Password need MD5 hasn and add salt.
    // - Auto signin after regist successfully.
    ctx.body = { message: 'sign in seccessfully!' };
  });

// WARNING!! DO NOT TOUCH THIS!
// This route is used to DEBUG session.
router
  .get('/api/view', async ctx => {
    ctx.session.count = ctx.session.count || 0;
    ctx.session.count += 1;

    ctx.body = ctx.session.count;
  })
  .get('/api/secret', signinRequired, async ctx => {
    ctx.body = 'This is secret';
  });

// Sign in and Sign out middleware.
// This is reusable middleware function
async function signin(ctx, next) {
  // TODO
  await next();
}

async function signout() {
  // TODO
  await next();
}

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
