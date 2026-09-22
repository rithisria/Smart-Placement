const express = require("express");
const Job = require("../models/job");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.post("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const job = new Job(req.body);

        await job.save();

        res.status(201).json({
            message: "Job created successfully",
            job: job
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
router.get("/", async (req, res) => {
    try {
        const jobs = await Job.find();
        const uniqueJobs = Array.from(
            new Map(jobs.map((job) => [`${job.company}|${job.role}|${job.location}`, job])).values()
        );

        res.status(200).json(uniqueJobs);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
console.log("Job routes loaded");
module.exports = router;