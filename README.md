# 🚀 Daily Flow - Recurring To-Do App

## Overview

Daily Flow is a web application designed to simplify task management by focusing on daily, recurring commitments. Built with a modern **Node.js** backend and a **MongoDB** database, it offers a fast, secure, and clean user experience with a light theme powered by **Tailwind CSS**.

---

## Features

* **Secure User Authentication:** Sign-up and login with secure password hashing (using bcrypt or similar) for data protection.
* **Daily Focus:** The main dashboard automatically filters and displays only the tasks scheduled for the **current day**.
* **Recurring Tasks:** Tasks can be configured to repeat on specific **days of the week**, making them ideal for routines and habits.
* **Intuitive Priority Control:** A dedicated screen allows users to easily drag/drop or use up/down controls to set the global priority order for all tasks.
* **Task Completion Toggling:** Mark tasks as complete for the day with a single tap.

---

## Technology Stack

* **Frontend:** HTML/JavaScript
* **Styling:** Tailwind CSS (Light Theme)
* **Backend:** Node.js
* **Database:** MongoDB (using Mongoose)
* **Deployment:** Render.com

---

### Prerequisites

* Node.js (LTS version)
* npm

---

## Deployment

This application is configured for easy deployment on **Render.com**. Follow the standard Render deployment process for a Node.js web service, ensuring your environment variables (especially for session secrets and security keys) are correctly configured.

---

# 🔒 Security Best Practices

## 1. Data Protection and LowDB Security 🛡️

The **LowDB** file is the most critical asset. You must assume it could be compromised and therefore protect its contents.

### 1.1 Encrypt Sensitive Data
**NEVER** store sensitive information (e.g., API keys, user passwords, private AI keys) in plain text in the LowDB JSON file.

* **Passwords:** Use a strong, slow hashing algorithm like **bcrypt** to hash all passwords before saving them. Only store the hash.
* **API Keys/Secrets:** If the project stores external keys/secrets, you must **encrypt** them using a module like Node's built-in `crypto` library with a standard like AES-256-GCM. Store the encrypted key, initialization vector (IV), and salt (if applicable).

### 1.2 Secure the LowDB File Access
The LowDB file must not be web-accessible.

* **File Location:** Store the LowDB file **outside the public-facing root directory** of your application (e.g., place it in a dedicated `data/` folder that is not served by your web server).
* **File Permissions:** Set file permissions to restrict read/write access to only the Node.js process user. Use commands like `chmod 600 your-db.json` on Linux/macOS systems.

## 2. Server and Application Security (Node.js) 🌐

These are standard, non-negotiable best practices for any Node.js application.

### 2.1 Use Security Middleware
Use the **helmet** package to set essential HTTP response headers.

* **Instruction:** Install `helmet` and use it as middleware in your Express (or similar) application.
* **Purpose:** Protects against common web vulnerabilities like Cross-Site Scripting (**XSS**), clickjacking, and other code injection attacks by setting headers like `Content-Security-Policy`, `X-Frame-Options`, and `Strict-Transport-Security`.

### 2.2 Input Validation and Sanitization
Treat all user input as hostile. LowDB's JSON structure is inherently vulnerable to attacks if you pass untrusted user data directly.

* **Instruction:** Validate and sanitize every piece of user input (`req.body`, `req.query`, `req.params`) using libraries like **express-validator** or **validator.js**.
* **Mitigation:** If you use input to construct queries or manipulate data that might be displayed on a webpage, you must escape or sanitize it to prevent XSS attacks.

### 2.3 Rate Limiting and Brute Force Protection
Protect your API endpoints, especially login and registration, from malicious automated requests.

* **Instruction:** Implement rate limiting using a package like **express-rate-limit**. Limit the number of requests from a single IP address over a short period.
* **Purpose:** Prevents Denial-of-Service (**DoS**) attacks and slows down brute-force login attempts.

## 3. Secrets Management and Project Health 🔑

### 3.1 Environment Variables for Secrets
Never hardcode critical secrets (like the secret key used for JWT signing or the encryption key for LowDB data) directly in the source code.

* **Instruction:** Store secrets in a **.env** file (locally) and load them using the **dotenv** package.
* **Rule:** Add **.env** to your **.gitignore** file immediately to ensure secrets are never committed to version control. In production, provide these secrets via the deployment platform's environment variable mechanism.

### 3.2 Dependency Management
A large percentage of security breaches exploit known vulnerabilities in third-party libraries.

* **Instruction:** Regularly run `npm audit` and address any high-severity vulnerabilities immediately.
* **Process:** Keep all dependencies up-to-date and remove any unused packages to minimize your attack surface.

### 3.3 Secure Session and Authentication
If your project has user login/sessions, follow these steps:

* **JWT Secrets:** Use a strong, unique secret (stored in environment variables) to sign JWTs. Ensure JWTs have a short expiry time (`exp`).
* **HTTP-Only Cookies:** If using cookies for sessions, set the **HttpOnly** flag to prevent client-side JavaScript (and thus XSS attacks) from accessing the session token.