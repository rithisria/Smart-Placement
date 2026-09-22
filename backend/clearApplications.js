const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const Application = require("./models/application");

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const result = await Application.deleteMany({});
        console.log(`${result.deletedCount} applications cleared. All jobs are now unapplied.`);
        await mongoose.disconnect();
    })
    .catch(async (error) => {
        console.error("Could not clear applications:", error.message);
        await mongoose.disconnect();
        process.exitCode = 1;
    });