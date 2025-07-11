# 📚 Shiksha Notification Microservice

The Notification Service is designed to efficiently deliver notifications to end users. It supports multiple notification types including SMS, PUSH, and email, ensuring that users are informed promptly and through their preferred communication channel. This service is essential for keeping users engaged and informed about various events and activities within an application or system. To send notifications, we first create NotificationAction and NotificationActionTemplate to store notification actions and their template configuration respectively. These maintain details such as title, status, key, types of notification with its configuration [subject,body], created and updated timestamps, and more. Once these are set up, the system can handle notification requests, determine the appropriate adapter to use, log the results, and provide a unified response to the client.

## 🏗️ Architecture

### **Technology Stack**
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## 📦 Installation

### **Prerequisites**
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)

### **Setup**
```bash
# Clone the repository
git clone [https://github.com/tekdi/notification-microservice](https://github.com/tekdi/notification-microservice.git)
cd notification-service

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Configure environment variables
# Edit .env file with your database and other settings

# Start the application
npm run start:dev
```

### **Environment Variables**
```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=notification
POSTGRES_USERNAME=password

RABBITMQ_URL=amqp://localhost:5672


# Application
PORT=3000
NODE_ENV=development
```


### **Run RabbitMQ locally (recommended for development)**

```bash
docker run -d --hostname rabbit-host --name rabbitmq-dev \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management
```
UI will be at: http://localhost:15672

Default user/pass: guest / guest

AMQP will work at amqp://localhost:5672
