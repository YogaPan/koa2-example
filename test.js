import test from 'ava';
import request from 'request';

test('index page', async t => {
  t.plan(2);

  const { res, body } = await getRequest('http://127.0.0.1:3000');

  t.is(res.statusCode, 200);
  t.not(body, '');
});

test('get members', async t => {
  t.plan(2);

  const { res, body } = await getRequest('http://127.0.0.1:3000/api/members');

  t.is(res.statusCode, 200);
  t.true(isJsonString(body));
});

test('post members', async t => {
  // TODO
});

function getRequest(url) {
  return new Promise(function (resolve, reject) {
    request(url, function (error, res, body) {
      if (!error)
        resolve({
          res,
          body,
        });
      else
        reject(error);
    });
  });
}

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
