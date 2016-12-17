const router = require('koa-router')();
const conn = require('./models/index.js'); // MySQL connection.

// Restful router.
router
  .get('/api/members', async ctx => {
    ctx.body = await conn.query('SELECT * FROM Members');
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
