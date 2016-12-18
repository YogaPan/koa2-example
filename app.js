const Koa = require('koa');
const app = new Koa;

const convert = require('koa-convert');
const logger = require('koa-logger');
const serve = require('koa-static');
const session = require('koa-generic-session');
const redisStore = require('koa-redis');
const bodyParser = require('koa-bodyparser');

const path = require('path');

const router = require('./router.js');
const port = 3000; // Set server listen port.

// Use redis to store session.
app.keys = ['secret', 'you dont know'];
app.use(convert(session({
  store: redisStore(),
})));

// Show all request, include path, status code and spent time.
app.use(logger());

// Parse post form as json.
app.use(bodyParser());

// Serve static files in "public" directory.
app.use(serve(path.join(__dirname, '/public')));

// Catch all server internal errors and display message.
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.body = { message: err.message };
    ctx.status = err.status || 500;

    // Show error message to server side.
    console.error(err);

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
// All path defined in router.js file.
app
  .use(router.routes())
  .use(router.allowedMethods());

// Default listen port is 8080.
app.listen(port || 8080, () => {
  console.log(`server start listening on port ${port}`);
});
