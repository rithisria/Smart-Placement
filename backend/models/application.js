const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true
    },

    status: {
        type: String,
        enum: ["Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected", "Absent"],
        default: "Applied"
    },

    willingToRelocate: {
        type: String,
        enum: ["Yes", "No"]
    },

    willingToWorkNightShifts: {
        type: String,
        enum: ["Yes", "No"]
    },

    resume: {
        filename: String,
        originalName: String
    }
});

const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;