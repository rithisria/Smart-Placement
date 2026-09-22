const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    phone: String,
    college: String,
    course: String,
    graduationYear: String,
    github: String,
    linkedin: String,

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["student", "admin"],
        default: "student"
    },

    skills: {
        type: [String],
        default: []
    },

    resume: {
        filename: String,
        originalName: String,
        uploadedAt: Date
    }
});

const User = mongoose.model("User", userSchema);

module.exports = User;