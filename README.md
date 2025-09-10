Here are the Instructions for Installing and Testing the Project.

### **Setup and Installation Guide**

Follow these steps to run the project locally.

**Prerequisites**

- Node.js
- Bun
- MongoDB

**1. Clone the Repository**

```bash
git clone https://github.com/abhishekkushwahaa/oralvis.git
cd oralvis
```

**2. Backend Setup**

```bash
cd backend
bun install
```

**`backend/.env`**

```
PORT=5001
MONGO_URI=connectionUrl
JWT_SECRET=SomeRandomSecretKey
```

```bash
# Run the backend server
bun run dev
```

The server will be running on `http://localhost:5001`.

**3. Frontend Setup**

```bash
cd frontend
bun install
```

**`frontend/.env`**

```
VITE_API_BASE_URL=http://localhost:5001
```

```bash
# Run the frontend server
bun run dev
```

The application will be accessible at `http://localhost:5173`.

### **Test Credentials**

You can use the following credentials to test the application:

| Role        | Email                 | Password     |
| :---------- | :-------------------- | :----------- |
| **Admin**   | `admin@oralvis.com`   | `admin123`   |
| **Patient** | `patient@oralvis.com` | `patient123` |
