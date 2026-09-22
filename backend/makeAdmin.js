const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const User = require("./models/user");

const email = process.argv[2];

if (!email) {
    throw new Error("Usage: npm run make:admin -- user@example.com");
}

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const user = await User.findOneAndUpdate(
            { email: email.trim().toLowerCase() },
            { role: "admin" },
            { new: true }
        );

        if (!user) throw new Error("No user found with that email");
        console.log(`Admin access enabled for ${user.email}`);
        await mongoose.disconnect();
    })
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });