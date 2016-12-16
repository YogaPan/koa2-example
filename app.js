const Koa = require('koa');
const app = new Koa();

const conn = require('./models/index');
const port = 3000;

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.body = { message: err.message };
    ctx.status = err.status || 500;
  }
});

app.use(async ctx => {
  ctx.body = await conn.query('SELECT * FROM Members');
});

app.listen(port || 8080, () => {
  console.log(`server start listening on port ${port}`);
});
