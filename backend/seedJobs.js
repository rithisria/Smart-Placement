const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const Job = require("./models/job");

const jobs = [
    {
        company: "Google",
        role: "Software Engineer",
        description: "Build web applications",
        skills: ["React", "Node.js", "MongoDB", "JavaScript", "Git", "REST APIs"],
        location: "Bangalore",
        salary: "8 LPA",
        deadline: "2026-09-23T17:00:00+05:30"
    },
    {
        company: "Microsoft",
        role: "Frontend Developer",
        description: "Build accessible and reliable web experiences for Microsoft products.",
        skills: ["React", "JavaScript", "CSS", "TypeScript", "Accessibility", "Git"],
        location: "Hyderabad",
        salary: "10 LPA",
        deadline: "2026-09-26T18:00:00+05:30"
    },
    {
        company: "Amazon",
        role: "Backend Engineer",
        description: "Design scalable services and APIs used by millions of customers.",
        skills: ["Node.js", "MongoDB", "Express", "AWS", "Docker", "REST APIs"],
        location: "Bangalore",
        salary: "12 LPA",
        deadline: "2026-09-30T23:59:00+05:30"
    },
    {
        company: "Infosys",
        role: "Full Stack Developer",
        description: "Deliver end-to-end solutions for enterprise customers.",
        skills: ["React", "Node.js", "SQL", "JavaScript", "Git", "API Design"],
        location: "Pune",
        salary: "7 LPA",
        deadline: "2026-10-03T17:30:00+05:30"
    },
    {
        company: "TCS",
        role: "Cloud Engineer",
        description: "Build and maintain cloud infrastructure for enterprise systems.",
        skills: ["AWS", "Docker", "Linux", "Kubernetes", "Terraform", "CI/CD"],
        location: "Chennai",
        salary: "8 LPA",
        deadline: "2026-10-06T18:00:00+05:30"
    },
    {
        company: "Accenture",
        role: "Data Analyst",
        description: "Turn business data into clear insights and useful decisions.",
        skills: ["Python", "SQL", "Power BI", "Excel", "Tableau", "Statistics"],
        location: "Mumbai",
        salary: "9 LPA",
        deadline: "2026-10-09T17:00:00+05:30"
    },
    {
        company: "Wipro",
        role: "QA Automation Engineer",
        description: "Create automated tests that keep software releases reliable.",
        skills: ["Java", "Selenium", "SQL", "TestNG", "Jenkins", "API Testing"],
        location: "Bangalore",
        salary: "7.5 LPA",
        deadline: "2026-10-12T23:59:00+05:30"
    },
    {
        company: "IBM",
        role: "Cloud Application Developer",
        description: "Create cloud-native applications for enterprise teams.",
        skills: ["JavaScript", "Docker", "AWS", "Kubernetes", "Microservices", "CI/CD"],
        location: "Bangalore",
        salary: "11 LPA",
        deadline: "2026-10-15T18:30:00+05:30"
    },
    {
        company: "Deloitte",
        role: "Technology Consultant",
        description: "Help clients turn technology strategy into measurable outcomes.",
        skills: ["Python", "SQL", "Communication", "Cloud", "Agile", "Problem Solving"],
        location: "Gurugram",
        salary: "9.5 LPA",
        deadline: "2026-10-18T17:00:00+05:30"
    },
    {
        company: "Meta",
        role: "Product Engineer",
        description: "Build products that connect people and communities.",
        skills: ["React", "TypeScript", "GraphQL", "JavaScript", "Git", "System Design"],
        location: "Remote",
        requiresNightShifts: false,
        salary: "18 LPA",
        deadline: "2026-10-21T23:59:00+05:30"
    }
];

async function seedJobs() {
    await mongoose.connect(process.env.MONGO_URI);

    for (const job of jobs) {
        await Job.updateMany(
            { company: job.company, role: job.role, location: job.location },
            { $set: job },
            { upsert: true }
        );
    }

    console.log(`${jobs.length} jobs seeded successfully.`);
    await mongoose.disconnect();
}

seedJobs().catch(async (error) => {
    console.error("Could not seed jobs:", error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
});