📂 Project Structure
backendobe/
│
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.js             # Seed data script
│   └── migrations/         # Prisma migrations
│
├── src/
│   └── app.js              # Express app entry point
│
├── .env                    # Environment variables
├── package.json
├── prisma.config.ts
└── README.md

🎯 Core Features Implemented
✅ Academic Structure

Program hierarchy (UG / PG → Degree Programs)

Departments under programs

Courses mapped to departments

✅ Outcome Models

CLO (Course Learning Outcomes)

PO (Program Outcomes)

PSO (Program Specific Outcomes)

✅ Mapping Logic

CLO → PO mapping (0–3 correlation levels)

CLO → PSO mapping (0–3 correlation levels)

✅ Role Support

Admin

HOD

Faculty

Student (planned)

🧠 OBE Design Philosophy

POs & PSOs are predefined at program level

HOD does not manually write POs/PSOs

HOD maps CLOs to POs/PSOs (SRS-1 focus)

Detailed attainment & review workflows are planned for later phases

🛠️ Setup Instructions
1️⃣ Clone the Repository
git clone https://github.com/your-username/obe-backend.git
cd obe-backend

2️⃣ Install Dependencies
npm install

3️⃣ Configure Environment Variables

Create a .env file in the root directory:

DATABASE_URL="mysql://username:password@localhost:3306/obe_system"
PORT=5000

4️⃣ Run Database Migrations
npx prisma migrate dev

5️⃣ Seed Initial Data
npx prisma db seed


Seed data includes:

UG / PG program levels

BSc Computer Science program

Computer Science department

Test HOD user

One test course: Data Science

6️⃣ Start the Server
node src/app.js


Server will start on:

http://localhost:5000

🧪 Test Server Health

Open browser or Postman:

http://localhost:5000


Expected output:

Server running successfully
