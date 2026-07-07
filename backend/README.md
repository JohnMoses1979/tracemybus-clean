# TraceMyBus Backend - Local MySQL Version

Java 17 + Spring Boot + MySQL backend for TraceMyBus.

## Requirements

- Java 17
- Maven or included `mvnw.cmd`
- MySQL running locally

## Database

Create database:

```sql
CREATE DATABASE IF NOT EXISTS tracemybus;
```

Edit local settings here:

```txt
src/main/resources/application.yml
```

Important values:

```yml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/tracemybus?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata
    username: root
    password: your_mysql_password
```

## Email OTP

Update Gmail App Password in:

```txt
src/main/resources/application.yml
```

```yml
spring:
  mail:
    username: kalyanbliss27@gmail.com
    password: your_16_character_gmail_app_password
```

## Run

Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Backend URL:

```txt
http://localhost:8080/api
```
