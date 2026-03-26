const fetch = require("node-fetch");
(async () => {
  try {
    const login = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "hod.cs@college.edu",
        password: "password123",
      }),
    });
    const loginData = await login.json();
    console.log("login", login.status, loginData);

    if (!loginData.token) return;

    const courses = await fetch(
      "http://localhost:5000/api/hod/courses?year=2026&semester=4",
      {
        headers: {
          Authorization: "Bearer " + loginData.token,
        },
      },
    );
    const data = await courses.json();
    console.log("courses", courses.status, data);
  } catch (e) {
    console.error("error", e);
  }
})();
