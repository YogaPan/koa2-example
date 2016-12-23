const config = require('./config.js');

const api_key = config.mailgun.api_key;
const domail  = confog.mailgun.domail;
const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

// GenerateRandom Token used by Activate URLS.
function generateRandomHash() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';

  for (let i = 16; i > 0; --i) {
    token += chars[Math.round(Math.random() * (chars.length - 1))];
  }

  return token;
}

module.exports.sendActivateMail = function(mailAddress) {
  const token = generateRandomHash();

  const data = {
    from: 'Urban Walks <me@samples.mailgun.org>',
    to: mailAddress,
    subject: 'Hello to Urban Walks!!',
    text: `
    Welcome to join our service!
    to activate your account you have to
    https://140.136.148.215/verify/${token}
    `
  };

  // Use mailgun service to send email to user.
  mailgun.messages().send(data, (error, body) => {
    if (error)
      return console.error(error);
    console.log(body);
  });

  return token;
};
