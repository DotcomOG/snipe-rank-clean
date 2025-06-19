// 📄 server.js — Updated June 19, 2025 @ 2:30 PM ET

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import friendlyRoute from "./api/friendly.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Mount API routes
app.use("/api", friendlyRoute);

app.get("/", (req, res) => {
  res.send("SnipeRank AI SEO Backend is running ✅");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});