const api_key = 'key-77491d2c5f1d570d274b2a87bb79fe47';
const domain = 'sandboxe43ec0fedd914b0291cb621373abf1a5.mailgun.org';
const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

// GenerateRandom Hash used by Activate URLS.
function generateRandomHash() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';

  for (let i = 16; i > 0; --i) {
    token += chars[Math.round(Math.random() * (chars.length - 1))];
  }

  // create expiration date
  const expires = new Date();
  expires.setHours(expires.getHours() + 6);

  // Set User expiration Data and save to database.
  // user.resetToken = {
  //   token: token,
  //   expires: expires
  // };

  return token;
}

module.exports.sendActivateMail = function(mailAddress) {
  const ActivateUrl = generateRandomHash();

  const data = {
    from: 'Urban Walks <me@samples.mailgun.org>',
    to: mailAddress,
    subject: 'Hello to Urban Walks!!',
    text: `Welcome to join our service!
    to activate your account you have to
    https://140.136.148.215/verify/${ActivateUrl}
    `
  };

  // Use mailgun service to send email to user.
  mailgun.messages().send(data, function (error, body) {
    console.log(body);
  });
};
