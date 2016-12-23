const redis = require('./redis.js');


async function testRedis() {
  let error = await redis.get('test:ThisIsToken');
  if (error === null)
    console.log('Nothing');

  await redis.setex('test:ThisIsToken', 2 * 60, 'YogaPan');

  const user = await redis.get('test:ThisIsToken');
  console.log(user);

  redis.del('test:ThisIsToken');

  error = await redis.get('test:ThisIsToken');
  if (error === null)
    console.log('Nothing');
}

testRedis();
