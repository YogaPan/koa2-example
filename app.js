const Koa = require('koa');
const app = new Koa();

const router = require('koa-router')();
const conn = require('./models/index'); // MySQL connection.
const port = 3000; // Set server listen port.

// Restful router.
router
  .get('/', async ctx => {
    ctx.body = await conn.query('SELECT * FROM Members');
  })
  .get('/fuck', async ctx => {
    ctx.body = 'Fuck';
  })

// Error handling middleware.
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.body = { message: err.message };
    ctx.status = err.status || 500;
  }
});

// Use router.
app
  .use(router.routes())
  .use(router.allowedMethods());

// Default listen port is 8080.
app.listen(port || 8080, () => {
  console.log(`server start listening on port ${port}`);
});
