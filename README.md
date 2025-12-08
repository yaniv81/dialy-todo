# 🚀 Daily Flow PWA - Recurring To-Do App

## Overview

Daily Flow is a Progressive Web Application (PWA) designed to simplify task management by focusing on daily, recurring commitments. Built with a modern Node.js backend and a SQLite database, it offers a fast, secure, and clean user experience with a light theme powered by Tailwind CSS.

## Features

* **Secure User Authentication:** Sign-up and login with secure password hashing (using bcrypt or similar) for data protection.
* **Daily Focus:** The main dashboard automatically filters and displays only the tasks scheduled for the **current day**.
* **Recurring Tasks:** Tasks can be configured to repeat on specific **days of the week**, making them ideal for routines and habits.
* **Intuitive Priority Control:** A dedicated screen allows users to easily drag/drop or use up/down controls to set the global priority order for all tasks.
* **Task Completion Toggling:** Mark tasks as complete for the day with a single tap.
* **PWA Ready:** Installable on desktop and mobile devices for a native app feel and potential offline access.

## Technology Stack

* **Frontend:** HTML/JavaScript
* **Styling:** Tailwind CSS (Light Theme)
* **Backend:** Node.js
* **Database:** Embedded SQLite
* **Deployment:** Render.com

## Setup and Installation

### Prerequisites

* Node.js (LTS version)
* npm or yarn

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yaniv81/dialy-todo](https://github.com/yaniv81/dialy-todo)
    cd dialy-todo
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Start the application:**
    ```bash
    npm start
    # or
    yarn start
    ```
4.  Open your browser and navigate to `http://localhost:[PORT]` (Default port will be specified in the console).

## Deployment

This application is configured for easy deployment on **Render.com**. Follow the standard Render deployment process for a Node.js web service, ensuring your environment variables (especially for session secrets and security keys) are correctly configured.
