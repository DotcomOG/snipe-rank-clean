// server.js — Last updated 2025-06-10 @ 12:48 PM ET
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import friendlyRoute from "./friendly.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SnipeRank AI SEO Backend is running ✅");
});

// Mount the /friendly route
app.get("/friendly", friendlyRoute);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});// 🟢 Force change to trigger Render deploy
