# 🚂 RailEase — CLI Railway Reservation System

<div align="center">

### A Role-Based Command Line Java Application for Railway Ticket Booking & Management

Book Tickets • Search Trains by City • PNR Status • Waiting List • Admin Control Panel

![Java](https://img.shields.io/badge/Java-17+-orange?style=for-the-badge&logo=java)
![MySQL](https://img.shields.io/badge/MySQL-8.x-blue?style=for-the-badge&logo=mysql)
![JDBC](https://img.shields.io/badge/JDBC-Driver-red?style=for-the-badge)
![XAMPP](https://img.shields.io/badge/XAMPP-MariaDB-FB7A24?style=for-the-badge&logo=xampp)
![CLI](https://img.shields.io/badge/Interface-CLI-black?style=for-the-badge)

</div>

---

## 📖 Overview

**RailEase** is a fully functional **Command Line Interface (CLI)** based Railway Reservation System built using **Core Java** and **MySQL**. It simulates a real-world railway booking system where users can search for trains by city name, book tickets, check PNR status, and cancel bookings — all from the terminal.

The system supports two roles:

* 👨‍💼 **Admin** — Manage stations, trains, and journey schedules
* 👤 **User** — Search trains, book tickets, manage bookings

---

## ✨ Features

### 👨‍💼 Admin Module

* Secure Admin Login
* Add & View Railway Stations
* Add & View Trains with route details
* Disable / Deactivate Trains
* Schedule Journeys for specific travel dates
* View All Journeys with seat availability
* View All Bookings system-wide with passenger details

### 👤 User Module

* User Registration with SHA-256 password hashing
* Secure Login with masked password input
* **Search Trains by City Name** (no need to remember station codes)
* Smart station resolution — multiple stations in one city shown as a list to choose from
* Book Tickets for 1–6 passengers in one booking
* **Automatic CONFIRMED / WAITING LIST** status based on seat availability
* View My Bookings with train name, date, and status
* Check PNR Status with full passenger and seat details
* **Cancel Ticket** — automatically promotes first Waiting List booking to Confirmed

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────┐
│          CLI (Terminal Input)        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Menu Layer                  │
│  MainMenu → AdminMenu / UserMenu    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Service Layer               │
│  BookingService, TrainService, ...  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         DAO Layer                   │
│  BookingDAO, PassengerDAO, ...      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         MySQL Database              │
│         (via XAMPP / MariaDB)       │
└─────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Language | Java 17+ |
| Database | MySQL / MariaDB (XAMPP) |
| DB Driver | MySQL Connector/J 9.x (JDBC) |
| Password Security | SHA-256 Hashing |
| Interface | Command Line Interface (CLI) |
| Build | JAR (executable) |
| Version Control | Git & GitHub |

---

## 📂 Project Structure

```text
RailEase/
│
├── src/
│   ├── config/
│   │   └── DatabaseConfig.java         # DB credentials
│   │
│   ├── database/
│   │   └── DatabaseConnection.java     # JDBC connection singleton
│   │
│   ├── enums/
│   │   ├── BookingStatus.java          # CONFIRMED, WAITING, CANCELLED
│   │   ├── Gender.java                 # MALE, FEMALE, OTHER
│   │   ├── JourneyStatus.java          # SCHEDULED, COMPLETED, CANCELLED
│   │   ├── PaymentStatus.java          # SUCCESS, FAILED, REFUNDED
│   │   ├── Role.java                   # ADMIN, USER
│   │   └── Status.java                 # ACTIVE, INACTIVE
│   │
│   ├── model/
│   │   ├── User.java
│   │   ├── Train.java
│   │   ├── Station.java
│   │   ├── Journey.java
│   │   ├── Booking.java
│   │   └── Passenger.java
│   │
│   ├── dao/
│   │   ├── UserDAO.java
│   │   ├── StationDAO.java
│   │   ├── TrainDAO.java
│   │   ├── JourneyDAO.java
│   │   ├── BookingDAO.java
│   │   └── PassengerDAO.java
│   │
│   ├── service/
│   │   ├── UserService.java
│   │   ├── StationService.java
│   │   ├── TrainService.java
│   │   ├── JourneyService.java
│   │   └── BookingService.java
│   │
│   ├── menu/
│   │   ├── MainMenu.java               # Entry point menu
│   │   ├── AdminMenu.java              # Admin operations
│   │   └── UserMenu.java              # User operations
│   │
│   ├── util/
│   │   ├── InputValidator.java         # Safe int/double/password input
│   │   ├── DateUtil.java               # Date parsing & reading
│   │   ├── PNRGenerator.java           # Unique PNR generator
│   │   └── PasswordUtil.java           # SHA-256 hashing
│   │
│   └── main/
│       └── Main.java                   # Application entry point
│
├── lib/
│   └── mysql-connector-j-9.7.0.jar    # JDBC driver
│
├── seed_data.sql                       # Initial DB + sample stations & trains
├── seed_cities.sql                     # Additional city data
├── RailEase.jar                        # Compiled runnable JAR
├── manifest.txt                        # JAR manifest
├── .gitignore
└── README.md
```

---

## 🗄️ Database Schema

```text
┌──────────┐     ┌──────────┐     ┌──────────┐
│  users   │     │  trains  │     │ stations │
├──────────┤     ├──────────┤     ├──────────┤
│ user_id  │     │ train_id │     │station_id│
│ full_name│     │train_num │     │ code     │
│ email    │     │ name     │     │ name     │
│ phone    │     │ src_stn  │◄────│ city     │
│ password │     │ dst_stn  │     │ state    │
│ role     │     │ dept_time│     │ status   │
│ status   │     │ arrv_time│     └──────────┘
└──────────┘     │ seats    │
                 │ fare     │
                 └────┬─────┘
                      │
               ┌──────▼──────┐
               │  journeys   │
               ├─────────────┤
               │ journey_id  │
               │ train_id    │
               │ travel_date │
               │ avail_seats │
               │ status      │
               └──────┬──────┘
                      │
               ┌──────▼──────┐     ┌────────────┐
               │  bookings   │     │ passengers │
               ├─────────────┤     ├────────────┤
               │ booking_id  │◄────│passenger_id│
               │ pnr         │     │ booking_id │
               │ user_id     │     │ name       │
               │ journey_id  │     │ age        │
               │ amount_paid │     │ gender     │
               │ status      │     │ coach      │
               │ waiting_no  │     │ seat_no    │
               └─────────────┘     └────────────┘
```

---

## 🚉 Available Train Network

| Train No. | Train Name | From | To | Fare |
|---|---|---|---|---|
| 11301 | Udyan Express | Mumbai | Pune | ₹250 |
| 12015 | Ajmer Shatabdi Express | New Delhi | Jaipur | ₹450 |
| 12477 | Mumbai Surat Express | Mumbai | Surat | ₹300 |
| 12478 | Surat Mumbai Express | Surat | Mumbai | ₹300 |
| 12531 | Delhi Lucknow Shatabdi | New Delhi | Lucknow | ₹550 |
| 12532 | Lucknow Shatabdi | Lucknow | New Delhi | ₹550 |
| 12915 | Ashram Express | Ahmedabad | New Delhi | ₹750 |
| 12951 | Mumbai Rajdhani Express | New Delhi | Mumbai | ₹1500 |
| 19115 | Ahmedabad Rajkot Express | Ahmedabad | Rajkot | ₹200 |
| 19116 | Rajkot Ahmedabad Express | Rajkot | Ahmedabad | ₹200 |

---

## ⚙️ Installation & Setup

### Prerequisites

* Java 17 or higher installed
* XAMPP installed with MySQL/MariaDB running
* Git (optional)

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/baraiyash/RailEase.git
cd RailEase
```

### 2️⃣ Setup the Database

1. Open **phpMyAdmin** → `http://localhost/phpmyadmin`
2. Create a new database named `railease`
3. Import `seed_data.sql` → sets up tables, stations, and initial trains
4. Import `seed_cities.sql` → adds remaining cities and trains

Or run via terminal (XAMPP must be running):
```bash
"C:\xampp\mysql\bin\mysql.exe" -u root -e "source seed_data.sql"
"C:\xampp\mysql\bin\mysql.exe" -u root -e "source seed_cities.sql"
```

### 3️⃣ Create Admin User

Run this in phpMyAdmin or MySQL terminal:
```sql
INSERT INTO users (full_name, email, phone, password, role, status)
VALUES (
  'Admin',
  'admin@railease.com',
  '9999999999',
  SHA2('admin123', 256),
  'ADMIN',
  'ACTIVE'
);
```

### 4️⃣ Configure Database Credentials

Edit [`src/config/DatabaseConfig.java`](src/config/DatabaseConfig.java) if your MySQL credentials differ:
```java
public static final String URL      = "jdbc:mysql://localhost:3306/railease";
public static final String USERNAME = "root";
public static final String PASSWORD = "";
```

### 5️⃣ Run the Application

**Option A — Use the prebuilt JAR (recommended):**
```bash
java -jar RailEase.jar
```

**Option B — Compile and run from source:**
```bash
# Compile
javac -cp "lib\mysql-connector-j-9.7.0.jar" -sourcepath src -d out src\main\Main.java src\menu\*.java src\dao\*.java src\service\*.java src\model\*.java src\enums\*.java src\util\*.java src\database\*.java src\config\*.java

# Run
java -cp "out;lib\mysql-connector-j-9.7.0.jar" main.Main
```

---

## 🔐 User Roles & Access

| Role | Access |
|---|---|
| **Admin** | Add/View Stations, Add/View/Disable Trains, Schedule Journeys, View All Bookings |
| **User** | Register/Login, Search Trains by City, Book Tickets (1–6 passengers), View Bookings, Check PNR, Cancel Tickets |

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@railease.com` | `admin123` |
| User | Register via app | Your choice |

---

## 💻 Application Flow

```text
Start App
    │
    ├── Register (New User)
    │       └── Enter Name, Email, Phone, Password
    │
    └── Login
            ├── Admin Login
            │       ├── Add Station
            │       ├── View Stations
            │       ├── Add Train
            │       ├── View Trains
            │       ├── Disable Train
            │       ├── Schedule Journey  ← Assign a travel date to a train
            │       ├── View Journeys
            │       └── View All Bookings
            │
            └── User Login
                    ├── Search Trains     ← Type city names (e.g. "Mumbai", "Jaipur")
                    ├── Book Ticket       ← City → Train list → Date → Passengers → Confirm
                    ├── My Bookings       ← See all your bookings
                    ├── Check PNR         ← Full details with seat numbers
                    └── Cancel Ticket     ← Auto-promotes Waiting List
```

---

## 🎯 Key Highlights

### 🏙️ City-Based Train Search
Users type the **city name** instead of remembering station codes. The system automatically maps cities to stations. If a city has multiple stations, a numbered list is shown.

```
From City : Mumbai
To City   : Jaipur

Source Station : Mumbai Central (BCT), Mumbai
No trains found from Mumbai to Jaipur.
```

### 🎟️ Automatic Waiting List
When no seats are available, the booking is automatically placed in the Waiting List with a queue number.

### ♻️ Auto-Promotion on Cancellation
When a confirmed booking is cancelled, the first Waiting List booking is **automatically promoted to Confirmed** and seats are assigned.

### 🔐 Password Security
* Passwords are hashed with **SHA-256** before storing in the database
* Password input is **masked** in the terminal using `System.console().readPassword()`

### 🏷️ Unique PNR Generation
Each booking gets a unique PNR like `PNR172089473821234` using timestamp + random suffix.

---

## 📚 Core Modules

* Authentication & Authorization (Role-Based)
* Station Management
* Train Management
* Journey Scheduling
* Ticket Booking (Confirmed / Waiting List)
* PNR Tracking
* Booking Cancellation with Waiting List Promotion
* Passenger Management with Seat Assignment
* Admin Dashboard

---

## 🚀 Future Enhancements

* 🔢 OTP-Based Login / Email Verification
* 🖨️ Print Ticket to `.txt` File
* 💳 Payment Gateway Simulation
* 📊 Admin Reports & Statistics
* 🔄 Re-order Waiting List on Cancellation
* 📱 Convert to Spring Boot REST API
* 🌐 Web Frontend (React) Integration
* 🔔 Email Notifications on Booking / Cancellation

---

## 🧠 Key Learnings

Through this project, I gained hands-on experience in:

* Core Java Development & OOP Principles
* JDBC & MySQL Database Integration
* Layered Architecture Design (Menu → Service → DAO → Model)
* SQL Query Design with PreparedStatements (SQL Injection Prevention)
* Password Hashing using SHA-256 (`MessageDigest`)
* Waiting List Queue Logic & Auto-Promotion
* JAR Packaging & Deployment (Fat/Uber JAR)
* Git & GitHub Version Control
* DB Schema Design (Normalization, Foreign Keys, Constraints)
* CLI Application Design & User Experience

---

## 👨‍💻 Author

**Yash Barai**

* GitHub: [https://github.com/baraiyash](https://github.com/baraiyash)

---

## ⭐ Support

If you found this project useful, please give it a ⭐ on GitHub!

---

## 📜 License

This project is developed for educational and learning purposes.
