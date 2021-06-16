const mailer = require("nodemailer")

exports.mailSender = async (to,from,subject,message)=>{
    let transporter = mailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
          clientId: process.env.OAUTH_CLIENTID,
          clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN
        }
      })

    let mailOptions = {
        from: from,
        to: to,
        subject: subject,
        text: message
    };
    await transporter.sendMail(mailOptions);
}