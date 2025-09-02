# Email Header Analyzer

A full-stack application that can automatically identify the receiving chain and the ESP (Email Service Provider) type of any email sent to it using IMAP.This project provides a responsive user interface and a structured backend to analyze the hidden data within email headers.

---

## Live Demo
Live Link - https://email-analyzer-detective.vercel.app/

---

## Features

* **Automatic Email Processing**: Automatically detects and processes incoming emails via a scheduled IMAP connection.
* **Receiving Chain Analysis**: Extracts the email's full receiving chain, showing the path it traveled across servers.
* **ESP Detection**: Identifies the sender's Email Service Provider (e.g., Gmail, Outlook, Amazon SES) from the email headers.
* **User-Friendly Dashboard**: Presents the complex analysis results in a clean, responsive, and intuitive timeline format.

---

## Tech Stack

This project was built using the following technologies as required by the assignment:

* **Frontend**: Next.js, React, Axios, Tailwind CSS 
* **Backend**: Node.js, NestJS, `node-imap`, `mailparser`
* **Database**: MongoDB (with Mongoose) 
* **Deployment**: Vercel (Frontend) and Render (Backend) 

---

## Getting Started (Local Setup)

Follow these instructions to get the project running on your local machine.

### Prerequisites

* Node.js (v18 or later)
* npm
* Git
* MongoDB (A local instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [YOUR GITHUB REPOSITORY URL]
    cd [YOUR REPOSITORY FOLDER]
    ```

2.  **Setup the Backend:**
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file in the `backend` directory and add the following variables:
    ```env
    # MongoDB Connection String
    MONGO_URI=your_mongodb_connection_string

    # Email Account to Monitor
    IMAP_USER=your_email@gmail.com
    IMAP_PASSWORD=your_email_app_password
    IMAP_HOST=imap.gmail.com
    IMAP_PORT=993

    # The subject line the analyzer will look for
    TARGET_SUBJECT=LucidGrowthTestEmail
    ```

3.  **Setup the Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```
    Create a `.env.local` file in the `frontend` directory and add the following variable:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:3000
    ```

### Running the Application

You will need two separate terminals to run both the backend and frontend servers.

* **Terminal 1: Run the Backend**
    ```bash
    cd backend
    npm run start:dev
    ```
    The backend server will be running on `http://localhost:3001`.

* **Terminal 2: Run the Frontend**
    ```bash
    cd frontend
    npm run dev
    ```
    The frontend application will be running on `http://localhost:3000`.

---

## How to Use

1.  Open the live frontend URL in your browser.
2. The page will display a unique email address and subject line to use for the test.
3.  From your personal email client (like Gmail), send a new email to the provided address with the exact subject line.
4.  Once the email is sent, the frontend will automatically detect the completed analysis and display the **ESP Type** and the **Receiving Chain** on the screen].
