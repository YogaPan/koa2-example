const router = require('koa-router')();

// Restful router.
router
  .get('/api/members', async ctx => {
    ctx.body = await conn.query('SELECT * FROM Members');
  })
  .post('api/members', async ctx => {
    // TODO
  });

module.exports = router;
