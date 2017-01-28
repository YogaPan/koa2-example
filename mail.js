const config = require('./config.json');
var nodemailer = require('nodemailer');

const api_key = config.mailgun.api_key;
const domain  = config.mailgun.domain;
const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

// Generate random Token used by verify url.
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

  const transporter = nodemailer.createTransport({
    service: 'Gmail'
    auth: {
      user: 'yogapan85321@gmail.com',
    }
  });

  const options = {
    from: 'sdf',
  };

  const options = {
    from: '123@gmail.com',
    to: mailAddress,
    subject: 'Welcome to Urban Walks!!',
    text: `
    Welcome to join our service!
    to activate your account click this url:
    http://140.136.148.215:3000/verify/${token}
    `
  };

  transporter.sendMail(options,(error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(info.response);
    }
  });

  return token;
} 

// Send verify email and return verify token.
// module.exports.sendActivateMail = function(mailAddress) {
  // const token = generateRandomHash();

  // const data = {
    // from: 'Urban Walks <me@samples.mailgun.org>',
    // to: mailAddress,
    // subject: 'Hello to Urban Walks!!',
    // text: `
    // Welcome to join our service!
    // to activate your account you have to
    // http://140.136.148.215:3000/verify/${token}
    // `
  // };

  // Use mailgun service to send email to user.
  // mailgun.messages().send(data, (error, body) => {
    // if (error)
      // return console.error(error);
    // console.log(body);
  // });

  // return token;
// };

// sendActiveMail('hank84112092@gmail.com');
// sendActiveMail('yogapan85321@gmail.com');

