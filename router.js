const router = require('koa-router')();
const conn = require('./models/index.js'); // MySQL connection.

// WARNING!! DO NOT TOUCH IT!
// This route is used to debug session.
router
  .get('/api/view', async ctx => {
    ctx.session.count = ctx.session.count || 0;
    ctx.session.count += 1;
    ctx.body = ctx.session.count;
  });

// User sign in and sign out
router
  .post('/api/signin', async ctx => {
    // TODO
  })
  .get('/api/signout', async ctx => {
    ctx.session = null;
    ctx.body = {
      message: 'sign out successfully',
    };
  });

// Restful router.
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

module.exports = router;
