const express = require("express");
const mongoose = require("mongoose");
const Application = require("../models/application");
const Job = require("../models/job");
const User = require("../models/user");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const applicationStatuses = ["Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected", "Absent"];

router.post("/", async (req, res) => {
    try {
        if (!req.body.studentId || !req.body.jobId) {
            return res.status(400).json({ message: "Student and job are required" });
        }

        if (!mongoose.isValidObjectId(req.body.studentId) || !mongoose.isValidObjectId(req.body.jobId)) {
            return res.status(400).json({ message: "Invalid student or job ID" });
        }

        const job = await Job.findById(req.body.jobId);
        if (!job) {
            return res.status(404).json({ message: "This job is no longer available" });
        }

        const student = await User.findById(req.body.studentId);
        if (!student) {
            return res.status(404).json({ message: "Student account not found" });
        }
        if (!student.resume?.filename) {
            return res.status(400).json({ message: "Upload your resume before applying" });
        }

        const needsRelocationAnswer = job.location.toLowerCase() !== "remote";
        const needsNightShiftAnswer = Boolean(job.requiresNightShifts);
        if ((needsRelocationAnswer && !["Yes", "No"].includes(req.body.willingToRelocate)) || (needsNightShiftAnswer && !["Yes", "No"].includes(req.body.willingToWorkNightShifts))) {
            return res.status(400).json({ message: "Please answer all application questions" });
        }

        const existingApplication = await Application.findOne({
            studentId: req.body.studentId,
            jobId: req.body.jobId
        });

        if (existingApplication) {
            return res.status(409).json({ message: "You have already applied for this role" });
        }

        const applicationData = {
            studentId: req.body.studentId,
            jobId: req.body.jobId,
            resume: {
                filename: student.resume.filename,
                originalName: student.resume.originalName
            }
        };

        if (needsRelocationAnswer) applicationData.willingToRelocate = req.body.willingToRelocate;
        if (needsNightShiftAnswer) applicationData.willingToWorkNightShifts = req.body.willingToWorkNightShifts;

        const application = new Application(applicationData);

        await application.save();

        res.status(201).json({
            message: "Application submitted successfully",
            application: application
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
    try {
        const applications = await Application.find().populate("jobId", "company role location").populate("studentId", "name email college course").sort({ _id: -1 });
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/:studentId", async (req, res) => {
    try {
        const applications = await Application.find({
            studentId: req.params.studentId
        }).populate("jobId").sort({ _id: -1 });

        const uniqueApplications = Array.from(
            new Map(
                applications.map((application) => [
                    application.jobId?._id?.toString() || application._id.toString(),
                    application
                ])
            ).values()
        );

        res.status(200).json(uniqueApplications);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.patch("/:applicationId/status", requireAuth, requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.applicationId)) {
            return res.status(400).json({ message: "Invalid application ID" });
        }
        if (!applicationStatuses.includes(req.body.status)) {
            return res.status(400).json({ message: "Invalid application status" });
        }

        const application = await Application.findByIdAndUpdate(
            req.params.applicationId,
            { status: req.body.status },
            { new: true, runValidators: true }
        ).populate("jobId");

        if (!application) return res.status(404).json({ message: "Application not found" });
        res.status(200).json({ message: "Application status updated", application });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

console.log("Application routes loaded");
module.exports = router;