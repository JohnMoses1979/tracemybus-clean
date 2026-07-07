# Email OTP Setup - Local Version

This project now uses email OTP for registration and forgot password.

## Where to update Gmail password

Open:

```txt
backend/src/main/resources/application.yml
```

Find:

```yml
spring:
  mail:
    username: ${MAIL_USERNAME:kalyanbliss27@gmail.com}
    password: ${MAIL_PASSWORD:CHANGE_YOUR_GMAIL_APP_PASSWORD_HERE}
```

Replace `CHANGE_YOUR_GMAIL_APP_PASSWORD_HERE` with your Gmail App Password.

## Gmail App Password steps

1. Open Google Account.
2. Go to Security.
3. Enable 2-Step Verification.
4. Open App passwords.
5. Select Mail.
6. Generate password.
7. Copy the 16-character password.
8. Paste it in `application.yml`.

Do not use your normal Gmail login password.

## Local backend URL

```txt
http://localhost:8080/api
```

## Flow

- Register screen collects mobile number and mandatory email.
- OTP is sent to email.
- User verifies email OTP.
- After registration, user can login using registered mobile number and password.
