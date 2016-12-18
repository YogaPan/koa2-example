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
  .post('/api/signin', signoutRequired, async ctx => {
    // TODO
  })
  .get('/api/signout', signinRequired, async ctx => {
    ctx.session = null;
    ctx.body = { message: 'sign out successfully' };
  });

// WARNING!! DO NOT TOUCH IT!
// This route is used to debug session.
router
  .get('/api/view', async ctx => {
    ctx.session.count = ctx.session.count || 0;
    ctx.session.count += 1;
    ctx.body = ctx.session.count;
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
  // TODO
  await next();
}

async function signoutRequired(ctx, next) {
  // TODO
  await next();
}

module.exports = router;
