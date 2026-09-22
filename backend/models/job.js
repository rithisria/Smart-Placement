const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    company: {
        type: String,
        required: true
    },

    role: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    skills: {
        type: [String],
        default: []
    },

    location: {
        type: String,
        required: true
    },

    requiresNightShifts: {
        type: Boolean,
        default: false
    },

    salary: {
        type: String,
        required: true
    },

    deadline: {
        type: Date,
        required: true
    }
});

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;