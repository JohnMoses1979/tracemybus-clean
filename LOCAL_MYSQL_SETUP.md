# TraceMyBus - Local MySQL Setup

This version is local-only. It keeps the email OTP registration flow and removes Render/server deployment setup.

## 1) Create local MySQL database

Open MySQL Workbench or MySQL command line and run:

```sql
CREATE DATABASE IF NOT EXISTS tracemybus;
```

## 2) Update MySQL password

Open:

```txt
backend/src/main/resources/application.yml
```

Find:

```yml
spring:
  datasource:
    username: ${DB_USER:root}
    password: ${DB_PASSWORD:}
```

If your MySQL root has password, change it like this:

```yml
    username: ${DB_USER:root}
    password: ${DB_PASSWORD:your_mysql_password}
```

Example:

```yml
    password: ${DB_PASSWORD:MyPassword123}
```

## 3) Update Gmail app password for email OTP

In the same file, find:

```yml
spring:
  mail:
    username: ${MAIL_USERNAME:kalyanbliss27@gmail.com}
    password: ${MAIL_PASSWORD:CHANGE_YOUR_GMAIL_APP_PASSWORD_HERE}
```

Replace only the Gmail app password:

```yml
    password: ${MAIL_PASSWORD:your_16_character_gmail_app_password}
```

Use Gmail App Password, not your normal Gmail password.

## 4) Run backend locally

```bash
cd backend
mvnw.cmd spring-boot:run
```

Backend will run at:

```txt
http://localhost:8080/api
```

Health check:

```txt
http://localhost:8080/api/health
```

## 5) Run frontend locally

Open another terminal:

```bash
npm install
copy .env.example .env
npm start
```

For Expo Web on same PC, keep:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api
```

For Android emulator:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api
```

For Expo Go on a real mobile, use your laptop/PC IPv4 address:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_IPV4:8080/api
```

To find IPv4 in Windows PowerShell:

```powershell
ipconfig
```

## Login / Registration flow

- Registration requires mobile number and email.
- OTP is sent to email.
- OTP verification checks email OTP.
- Login uses registered mobile number + password.
