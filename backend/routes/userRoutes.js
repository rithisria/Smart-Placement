const express = require("express");
const User = require("../models/user");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const uploadDirectory = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDirectory,
        filename: (req, file, callback) => {
            callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
        }
    }),
    fileFilter: (req, file, callback) => {
        const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        callback(null, allowedTypes.includes(file.mimetype));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post("/", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = new User({
            ...req.body,
            role: "student",
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({
    message: "User registered successfully",
    token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "development-secret-change-me", { expiresIn: "8h" }),
    user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    skills: user.skills,
    resume: user.resume,
    phone: user.phone,
    college: user.college,
    course: user.course,
    graduationYear: user.graduationYear,
    github: user.github,
    linkedin: user.linkedin
    }
});

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        res.status(500).json({
            message: error.message
        });
    }
});

async function login(req, res, adminOnly = false) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        if (adminOnly && user.role !== "admin") {
            return res.status(403).json({ message: "This account does not have admin access" });
        }

        res.status(200).json({
            message: "Login successful",
            token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "development-secret-change-me", { expiresIn: "8h" }),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                skills: user.skills,
                resume: user.resume,
                phone: user.phone,
                college: user.college,
                course: user.course,
                graduationYear: user.graduationYear,
                github: user.github,
                linkedin: user.linkedin
            }
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}

router.post("/login", (req, res) => login(req, res));
router.post("/admin-login", (req, res) => login(req, res, true));

router.patch("/:id/profile", async (req, res) => {
    try {
        const profile = {
            name: String(req.body.name || "").trim(),
            email: String(req.body.email || "").trim(),
            phone: String(req.body.phone || "").trim(),
            college: String(req.body.college || "").trim(),
            course: String(req.body.course || "").trim(),
            graduationYear: String(req.body.graduationYear || "").trim(),
            github: String(req.body.github || "").trim(),
            linkedin: String(req.body.linkedin || "").trim()
        };
        const user = await User.findByIdAndUpdate(req.params.id, profile, { new: true, runValidators: true });

        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({
            message: "Profile updated successfully",
            user: { id: user._id, name: user.name, email: user.email, skills: user.skills, resume: user.resume, phone: user.phone, college: user.college, course: user.course, graduationYear: user.graduationYear, github: user.github, linkedin: user.linkedin }
        });
    } catch (error) {
        res.status(400).json({ message: error.code === 11000 ? "Email already registered" : error.message });
    }
});

router.patch("/:id/resume", upload.single("resume"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a PDF, DOC, or DOCX resume (maximum 5 MB)" });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                resume: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    uploadedAt: new Date()
                }
            },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Resume uploaded successfully",
            user: { id: user._id, name: user.name, email: user.email, skills: user.skills, resume: user.resume, phone: user.phone, college: user.college, course: user.course, graduationYear: user.graduationYear, github: user.github, linkedin: user.linkedin }
        });
    } catch (error) {
        res.status(400).json({ message: error.message || "Could not upload resume" });
    }
});

router.patch("/:id/skills", async (req, res) => {
    try {
        const skills = Array.isArray(req.body.skills)
            ? [...new Set(req.body.skills.map((skill) => String(skill).trim()).filter(Boolean))]
            : [];
        const user = await User.findByIdAndUpdate(req.params.id, { skills }, { new: true, runValidators: true });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Skills updated successfully",
            user: { id: user._id, name: user.name, email: user.email, skills: user.skills, resume: user.resume, phone: user.phone, college: user.college, course: user.course, graduationYear: user.graduationYear, github: user.github, linkedin: user.linkedin }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

console.log("User routes loaded");
module.exports = router;