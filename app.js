const Koa = require('koa');
const app = new Koa();

const router = require('koa-router')();
const logger = require('koa-logger');
const serve = require('koa-static');

const conn = require('./models/index'); // MySQL connection.
const port = 3000; // Set server listen port.

app.use(logger());
app.use(serve(__dirname + '/public'));

// Restful router.
router
  .get('/api/members', async ctx => {
    ctx.body = await conn.query('SELECT * FROM Members');
  })
  .post('api/members', async ctx => {
    // TODO
  });

// Catch all unhandled server internal errors and display message.
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.body = { message: err.message };
    ctx.status = err.status || 500;

    // Show error message to server side.
    console.log(err);

    // Show error message to client side.
    switch (ctx.accepts('html', 'json')) {
      case 'html':
        ctx.type = 'html';
        ctx.body = `<p>${err.message}</p>`;
        break;
      case 'json':
        ctx.type = 'json';
        ctx.body = { message: err.message  };
        break;
      default:
        ctx.type = 'text';
        ctx.body = err.message;
    }
  }
});

// 404 Not Found Page.
app.use(async (ctx, next) => {
  await next();
  if (ctx.status !== 404)
    return;
  ctx.status = 404;

  switch (ctx.accepts('html', 'json')) {
    case 'html':
      ctx.type = 'html';
      ctx.body = '<p>404 Page Not Found</p>'
      break;
    case 'json':
      ctx.type = 'json';
      ctx.body = { message: '404 Page Not Found' };
      break;
    default:
      ctx.type = 'text';
      ctx.body = '404 Page Not Found';
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
