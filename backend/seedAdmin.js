const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/user");

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running npm run seed:admin");
}

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const admin = await User.findOneAndUpdate(
            { email },
            { name: "Platform Admin", email, password: await bcrypt.hash(password, 10), role: "admin" },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`Admin account ready: ${admin.email}`);
        await mongoose.disconnect();
    })
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });