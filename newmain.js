var nodemailer = require('nodemailer');

//宣告發信物件
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'yogapan85321@gmail.com',
    pass: 'buoy-york-alewife-criminal'
  }
});

var options = {
  from: '123@gmail.com',
  to: 'hank84112092@gmail.com',
  subject: '這是 node.js 發送的測試信件',
  text: 'Hello world2',
};

//發送信件方法
transporter.sendMail(options, function(error, info){
  if (error){
    console.log(error);
  } else {
    console.log('訊息發送: ' + info.response);
  }
});
