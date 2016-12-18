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
  .get('/api/user', async ctx => { // garylai test 
    ctx.body = await conn.query('SELECT * FROM User');
  })
  .post('/api/members', async ctx => {
    ctx.body = ctx.request.body; // Test Post method.
  })
  .put('/api/members', async ctx => {
    // TODO
  })
  .del('/api/members', async ctx => {
    // TODO
  });

// User sign in and sign out
router
  .get('/api/signin', signoutRequired, async ctx => {
    ctx.session.username = 'admin';
    ctx.body = { message: 'sign in successfully!' };
  })
  .get('/api/signout', signinRequired, async ctx => {
    ctx.session = null;
    ctx.body = { message: 'sign out successfully' };
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
