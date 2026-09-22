import { useEffect, useState } from "react";
import { FaAmazon, FaMicrosoft } from "react-icons/fa6";
import { SiAccenture, SiGoogle, SiInfosys, SiMeta, SiTcs, SiWipro } from "react-icons/si";
import "./App.css";
import placementLogo from "./assets/placement-logo.svg";

const API_URL = "http://localhost:5000/api";
const processStages = ["Application Screening", "Test", "Group Discussion", "Technical Interview", "HR Round"];
const statusStage = { Applied: 0, "Under Review": 1, Shortlisted: 2, Interview: 3, Selected: 4 };

function normalizeSkill(skill) {
  return skill.toLowerCase().replace(/[.\s_-]/g, "");
}

function matchingScore(userSkills = [], jobSkills = []) {
  if (!jobSkills.length) return 0;
  const skills = new Set(userSkills.map(normalizeSkill));
  return Math.round((jobSkills.filter((skill) => skills.has(normalizeSkill(skill))).length / jobSkills.length) * 100);
}

function formatDeadline(deadline) {
  if (!deadline) return "Date to be announced";
  return new Date(deadline).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function profileLink(value) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function sortJobs(jobs) {
  return [...jobs].sort((firstJob, secondJob) => {
    const companyOrder = firstJob.company.localeCompare(secondJob.company);
    return companyOrder || firstJob.role.localeCompare(secondJob.role);
  });
}

function isDeadlineInRange(deadline, filter) {
  if (filter === "all") return true;
  if (!deadline) return false;

  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "today") {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return deadlineDate >= today && deadlineDate < tomorrow;
  }

  if (filter === "week") {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return deadlineDate >= today && deadlineDate < weekEnd;
  }

  if (filter === "year") return deadlineDate.getFullYear() === today.getFullYear();
  return deadlineDate.getFullYear() === today.getFullYear() && deadlineDate.getMonth() === today.getMonth();
}

const companyLogos = {
  Google: SiGoogle,
  Microsoft: FaMicrosoft,
  Amazon: FaAmazon,
  Infosys: SiInfosys,
  TCS: SiTcs,
  Accenture: SiAccenture,
  Wipro: SiWipro,
  Meta: SiMeta
};

function CompanyLogo({ company }) {
  const LogoComponent = companyLogos[company];
  if (company === "IBM") return <span className="company-wordmark ibm-mark" role="img" aria-label="IBM logo">IBM</span>;
  if (company === "Deloitte") return <span className="company-wordmark deloitte-mark" role="img" aria-label="Deloitte logo">Deloitte<span>.</span></span>;
  if (!LogoComponent) return <span className="company-fallback" aria-hidden="true">{company.charAt(0)}</span>;
  return <LogoComponent className="company-logo" role="img" aria-label={`${company} logo`} />;
}

function uniqueApplications(items = []) {
  return Array.from(new Map(items.map((application) => {
    const job = application.jobId;
    const key = job && typeof job === "object"
      ? `${job.company}|${job.role}|${job.location}`
      : String(job?._id || job || application._id);
    return [key, application];
  })).values());
}

function App() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", skills: "" });
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [view, setView] = useState("jobs");
  const [search, setSearch] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("all");
  const [applying, setApplying] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/jobs`)
      .then((response) => response.json())
      .then(setJobs)
      .catch(() => setMessage("Could not load opportunities. Is the backend running?"))
      .finally(() => setJobsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/applications/${user.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) setApplications(uniqueApplications(data));
      })
      .catch(() => setMessage("Could not load your applications."));
  }, [user]);

  const updateForm = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submitAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const endpoint = mode === "login" ? "/login" : "";
    const payload = { ...form, skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean) };
    try {
      const response = await fetch(`${API_URL}/users${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Request failed");
      if (data.token) localStorage.setItem("placementToken", data.token);
      setUser(data.user);
      setMessage(`Welcome, ${data.user.name}`);
      setForm({ name: "", email: "", password: "", skills: "" });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const response = await fetch(`${API_URL}/applications/${user.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load your applications.");
      setApplications(uniqueApplications(data));
      setView("applications");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const applyForJob = async ({ willingToRelocate, willingToWorkNightShifts, resumeFile }) => {
    const jobId = selectedJob?._id || selectedJob?.id;
    if (!jobId || applying) return;
    if (!user.resume?.filename && !resumeFile) {
      setMessage("Upload your resume before applying.");
      return;
    }

    setApplying(true);
    setMessage("");
    try {
      if (resumeFile) {
        const resumePayload = new FormData();
        resumePayload.append("resume", resumeFile);
        const resumeResponse = await fetch(`${API_URL}/users/${user.id}/resume`, { method: "PATCH", body: resumePayload });
        const resumeData = await resumeResponse.json();
        if (!resumeResponse.ok) throw new Error(resumeData.message || "Could not upload the selected resume");
        setUser(resumeData.user);
      }
      const response = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: user.id, jobId, willingToRelocate, willingToWorkNightShifts })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not submit application");
      setMessage(data.message);
      setSelectedJob(null);
      await loadApplications();
      setView("jobs");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setApplying(false);
    }
  };

  const updateSkills = async (skillsText) => {
    const skills = skillsText.split(",").map((skill) => skill.trim()).filter(Boolean);
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/skills`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update skills");
      setUser(data.user);
      setMessage("Skills updated successfully");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const uploadResume = async (file) => {
    if (!file) return;
    setResumeUploading(true);
    setMessage("");
    const payload = new FormData();
    payload.append("resume", file);
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/resume`, { method: "PATCH", body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not upload resume");
      setUser(data.user);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setResumeUploading(false);
    }
  };

  const updateProfile = async (profile) => {
    setProfileSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update profile");
      setUser(data.user);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      const response = await fetch(`${API_URL}/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("placementToken") || ""}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update application status");
      setApplications((current) => current.map((application) => application._id === data.application._id ? data.application : application));
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!user) {
    return <AuthScreen mode={mode} form={form} message={message} loading={loading} updateForm={updateForm} submitAuth={submitAuth} toggleMode={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }} jobs={jobs} />;
  }

  return <Dashboard user={user} jobs={jobs} applications={applications} selectedJob={selectedJob} view={view} message={message} search={search} setSearch={setSearch} setUser={(nextUser) => { if (!nextUser) localStorage.removeItem("placementToken"); setUser(nextUser); }} setView={setView} setSelectedJob={setSelectedJob} loadApplications={loadApplications} applyForJob={applyForJob} applying={applying} updateSkills={updateSkills} uploadResume={uploadResume} resumeUploading={resumeUploading} updateProfile={updateProfile} profileSaving={profileSaving} updateApplicationStatus={updateApplicationStatus} deadlineFilter={deadlineFilter} setDeadlineFilter={setDeadlineFilter} jobsLoading={jobsLoading} />;
}

function AuthScreen({ mode, form, message, loading, updateForm, submitAuth, toggleMode, jobs }) {
  return <main className="auth-layout">
    <section className="intro-panel">
      <p className="eyebrow">SMART PLACEMENT PLATFORM</p>
      <h1>Turn your skills into your next opportunity.</h1>
      <p className="intro-copy">Build your student profile, discover eligible roles, and track every application from one focused workspace.</p>
      <div className="feature-line"><span>01</span><p>Rule-based matching<br /><small>See how your skills align with each role.</small></p></div>
      <div className="stats-row"><span><strong>{jobs.length || "--"}</strong> open roles</span><span><strong>01</strong> student profile</span></div>
    </section>
    <section className="auth-card">
      <img className="brand-logo" src={placementLogo} alt="Student Placement" />
      <p className="eyebrow">STUDENT ACCESS</p>
      <h2>{mode === "login" ? "Welcome back" : "Create your profile"}</h2>
      <p className="muted">{mode === "login" ? "Sign in to continue your placement journey." : "Add your skills so we can find stronger matches."}</p>
      <form onSubmit={submitAuth}>
        {mode === "register" && <input name="name" placeholder="Full name" value={form.name} onChange={updateForm} required />}
        <input name="email" type="email" placeholder="Email address" value={form.email} onChange={updateForm} required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={updateForm} required />
        {mode === "register" && <input name="skills" placeholder="Skills, separated by commas" value={form.skills} onChange={updateForm} />}
        <button className="primary-button" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <button className="text-button" onClick={toggleMode}>{mode === "login" ? "New here? Create an account" : "Already registered? Sign in"}</button>
      {message && <p className="form-message">{message}</p>}
    </section>
  </main>;
}

// eslint-disable-next-line no-unused-vars
function AdminDashboard({ user, jobs, setJobs, setUser }) {
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState("");
  const [jobForm, setJobForm] = useState({ company: "", role: "", description: "", skills: "", location: "", salary: "", deadline: "" });
  const token = localStorage.getItem("placementToken");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` };

  useEffect(() => {
    fetch(`${API_URL}/applications/admin/all`, { headers: { Authorization: `Bearer ${localStorage.getItem("placementToken") || ""}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load applications");
        setApplications(data);
      })
      .catch((error) => setMessage(error.message));
  }, []);

  const createJob = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/jobs`, { method: "POST", headers, body: JSON.stringify({ ...jobForm, skills: jobForm.skills.split(",").map((skill) => skill.trim()).filter(Boolean) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create job");
      setJobs((current) => [...current, data.job]);
      setJobForm({ company: "", role: "", description: "", skills: "", location: "", salary: "", deadline: "" });
      setMessage("Opportunity published successfully");
    } catch (error) { setMessage(error.message); }
  };

  const updateStatus = async (applicationId, status) => {
    try {
      const response = await fetch(`${API_URL}/applications/${applicationId}/status`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update status");
      setApplications((current) => current.map((application) => application._id === applicationId ? data.application : application));
      setMessage("Application status updated");
    } catch (error) { setMessage(error.message); }
  };

  return <main className="app-shell admin-shell"><header className="topbar"><button className="brand-button" onClick={() => window.scrollTo(0, 0)} aria-label="Go to admin dashboard"><img className="brand-logo" src={placementLogo} alt="Student Placement" /></button><p className="admin-label">ADMIN CONSOLE</p><button className="profile-button" onClick={() => setUser(null)}><span>{user.name.charAt(0)}</span> Sign out</button></header><section className="dashboard-heading"><div><p className="eyebrow">ADMIN DASHBOARD</p><h1>Run placements<br />with clarity.</h1><p className="muted">Publish roles and move every application forward.</p></div><div className="match-summary"><strong>{applications.length}</strong><span>applications</span></div></section>{message && <p className="notice">{message}</p>}<section className="admin-grid"><form className="admin-form" onSubmit={createJob}><p className="section-label">PUBLISH OPPORTUNITY</p><h2>New role</h2><input placeholder="Company" value={jobForm.company} onChange={(event) => setJobForm({ ...jobForm, company: event.target.value })} required /><input placeholder="Role title" value={jobForm.role} onChange={(event) => setJobForm({ ...jobForm, role: event.target.value })} required /><textarea placeholder="Description" value={jobForm.description} onChange={(event) => setJobForm({ ...jobForm, description: event.target.value })} required /><input placeholder="Skills, separated by commas" value={jobForm.skills} onChange={(event) => setJobForm({ ...jobForm, skills: event.target.value })} /><input placeholder="Location" value={jobForm.location} onChange={(event) => setJobForm({ ...jobForm, location: event.target.value })} required /><input placeholder="Salary" value={jobForm.salary} onChange={(event) => setJobForm({ ...jobForm, salary: event.target.value })} required /><label className="admin-date">Application deadline<input type="datetime-local" value={jobForm.deadline} onChange={(event) => setJobForm({ ...jobForm, deadline: event.target.value })} required /></label><button className="primary-button" type="submit">Publish role</button></form><section className="admin-applications"><p className="section-label">APPLICATION REVIEW</p><h2>Student applications</h2>{applications.length ? applications.map((application) => <article className="admin-application" key={application._id}><div><p className="company-name">{application.jobId?.company} · {application.jobId?.role}</p><h3>{application.studentId?.name}</h3><p className="muted">{application.studentId?.email} · {application.studentId?.college || "College not provided"}</p></div><select value={application.status} onChange={(event) => updateStatus(application._id, event.target.value)}><option>Applied</option><option>Under Review</option><option>Shortlisted</option><option>Interview</option><option>Selected</option><option>Rejected</option><option>Absent</option></select></article>) : <p className="empty-state">No applications yet.</p>}</section></section><section className="admin-job-list"><p className="section-label">LIVE OPPORTUNITIES</p><h2>{jobs.length} published roles</h2></section></main>;
}

function Dashboard({ user, jobs, applications, selectedJob, view, message, search, setSearch, setUser, setView, setSelectedJob, loadApplications, applyForJob, applying, updateSkills, uploadResume, resumeUploading, updateProfile, profileSaving, updateApplicationStatus, deadlineFilter, setDeadlineFilter, jobsLoading }) {
  const filteredJobs = sortJobs(jobs.filter((job) => `${job.company} ${job.role} ${job.location} ${job.skills?.join(" ")}`.toLowerCase().includes(search.toLowerCase()) && isDeadlineInRange(job.deadline, deadlineFilter)));
  const appliedJobs = filteredJobs.filter((job) => isJobApplied(job, applications));
  const unappliedJobs = filteredJobs.filter((job) => !isJobApplied(job, applications));
  const topScore = jobs.length ? Math.max(...jobs.map((job) => matchingScore(user.skills, job.skills))) : 0;

  return <main className="app-shell">
    <header className="topbar"><button className="brand-button" onClick={() => setView("jobs")} aria-label="Go to explore roles"><img className="brand-logo" src={placementLogo} alt="Student Placement" /></button><nav><button className={view === "jobs" ? "active" : ""} onClick={() => setView("jobs")}>Explore roles</button><button className={view === "applications" ? "active" : ""} onClick={loadApplications}>My applications <small>{applications.length || ""}</small></button><button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>Profile</button></nav><button className="profile-button" onClick={() => setUser(null)}><span>{user.name.charAt(0).toUpperCase()}</span> {user.name} · Sign out</button></header>
    <section className="dashboard-heading"><div><p className="eyebrow">STUDENT DASHBOARD</p><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p className="muted">Find roles where your experience can make an impact.</p></div><div className="match-summary"><strong>{topScore}%</strong><span>best skill match</span></div></section>
    {message && <p className="notice">{message}</p>}
    {view === "profile" ? <ProfilePage user={user} updateProfile={updateProfile} profileSaving={profileSaving} updateSkills={updateSkills} uploadResume={uploadResume} resumeUploading={resumeUploading} /> : view === "jobs" ? <><section className="toolbar"><div><p className="section-label">RECOMMENDED OPPORTUNITIES</p><p className="muted">{filteredJobs.length} roles based on your profile</p></div><div className="job-filters"><input className="search-input" aria-label="Search companies or roles" placeholder="Search companies or roles" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="deadline-filter" aria-label="Filter by date of visit" value={deadlineFilter} onChange={(event) => setDeadlineFilter(event.target.value)}><option value="all">Date of visit</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option></select></div></section><JobGroups jobsLoading={jobsLoading} unappliedJobs={unappliedJobs} appliedJobs={appliedJobs} user={user} applications={applications} onSelect={setSelectedJob} /></> : <section className="applications-list"><p className="section-label">APPLICATION TRACKER</p><h2>Your applications</h2>{applications.length ? applications.map((application) => <ApplicationRow key={application._id} application={application} onStatusChange={updateApplicationStatus} />) : <p className="empty-state">You have not applied for any roles yet.</p>}</section>}
    {selectedJob && <JobModal job={selectedJob} user={user} applied={isJobApplied(selectedJob, applications)} message={message} onClose={() => setSelectedJob(null)} onApply={applyForJob} applying={applying} />}
  </main>;
}

function ApplicationRow({ application, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="application-row">
    <button className="application-heading" type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
      <span><span className="company-name">{application.jobId?.company}</span><strong>{application.jobId?.role}</strong></span>
      <span className="application-heading-right"><span className="application-status">{application.status}</span><span className="application-toggle" aria-hidden="true">{expanded ? "−" : "+"}</span></span>
    </button>
    {expanded && <ApplicationTracker application={application} onStatusChange={onStatusChange} />}
  </article>;
}

function ApplicationTracker({ application }) {
  const isRejected = application.status === "Rejected";
  const isAbsent = application.status === "Absent";
  const currentIndex = statusStage[application.status] ?? 0;
  return <div className="application-tracker" aria-label={`Application status: ${application.status}`}>
    {processStages.map((stage, index) => {
      const complete = index < currentIndex || (application.status === "Selected" && index === currentIndex);
      const current = index === currentIndex && !complete;
      const failed = (isRejected || isAbsent) && index === currentIndex;
      const state = failed ? application.status : complete ? "Cleared" : current ? "On Going" : "Yet To Start";
      return <div key={stage} className={`tracker-step ${complete ? "complete" : ""} ${current ? "current" : ""} ${failed ? "failed" : ""}`}><span className="step-number">{index + 1}</span><span className="step-content"><strong>{stage}</strong>{failed && <small>{isAbsent ? "Did not attend this stage" : "Application rejected"}</small>}</span><span className="step-state">{state}</span></div>;
    })}
  </div>;
}

function ProfilePage({ user, updateProfile, profileSaving, updateSkills, uploadResume, resumeUploading }) {
  return <section className="profile-page">
    <p className="section-label">STUDENT PROFILE</p>
    <h2>Your profile</h2>
    <p className="muted">Keep your personal details and application materials ready for recruiters.</p>
    <form className="profile-form" onSubmit={(event) => { event.preventDefault(); updateProfile(Object.fromEntries(new FormData(event.currentTarget))); }}>
      <label>Full name<input name="name" defaultValue={user.name} required /></label>
      <label>Email address<input name="email" type="email" defaultValue={user.email} required /></label>
      <label>Phone number<input name="phone" defaultValue={user.phone || ""} placeholder="+91 98765 43210" /></label>
      <label>College or university<input name="college" defaultValue={user.college || ""} placeholder="Your college name" /></label>
      <label>Course<input name="course" defaultValue={user.course || ""} placeholder="B.Tech Computer Science" /></label>
      <label>Graduation year<input name="graduationYear" defaultValue={user.graduationYear || ""} placeholder="2027" /></label>
      <label>GitHub profile<input name="github" defaultValue={user.github || ""} placeholder="github.com/username" /></label>
      <label>LinkedIn profile<input name="linkedin" defaultValue={user.linkedin || ""} placeholder="linkedin.com/in/username" /></label>
      <button className="primary-button" type="submit" disabled={profileSaving}>{profileSaving ? "Saving..." : "Save personal details"}</button>
    </form>
    <div className="profile-resources">
      <div><p className="section-label">SKILLS</p><form className="skills-form" onSubmit={(event) => { event.preventDefault(); updateSkills(event.target.elements.skills.value); }}><input name="skills" aria-label="Your skills" placeholder="Skills, separated by commas" defaultValue={user.skills?.join(", ")} /><button className="outline-button" type="submit">Update skills</button></form><div className="profile-skills">{user.skills?.length ? user.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>Add skills to improve matching.</span>}</div></div>
      <div><p className="section-label">RESUME</p><form className="resume-form" onSubmit={(event) => { event.preventDefault(); uploadResume(event.target.elements.resume.files[0]); }}><input name="resume" type="file" accept=".pdf,.doc,.docx" required /><button className="outline-button" type="submit" disabled={resumeUploading}>{resumeUploading ? "Uploading..." : "Upload resume"}</button></form>{user.resume && <p className="muted">Uploaded: {user.resume.originalName}</p>}</div>
    </div>
    <div className="profile-links"><p className="section-label">ONLINE PROFILES</p>{user.github ? <a href={profileLink(user.github)} target="_blank" rel="noreferrer">View GitHub profile ↗</a> : <span className="muted">Add your GitHub link above.</span>}{user.linkedin ? <a href={profileLink(user.linkedin)} target="_blank" rel="noreferrer">View LinkedIn profile ↗</a> : <span className="muted">Add your LinkedIn link above.</span>}</div>
  </section>;
}

function JobGroups({ jobsLoading, unappliedJobs, appliedJobs, user, applications, onSelect }) {
  if (jobsLoading) return <p className="empty-state">Loading opportunities...</p>;
  if (!unappliedJobs.length && !appliedJobs.length) return <p className="empty-state">No roles match your search.</p>;

  return <>
    <section className="job-group"><h2>Unapplied jobs <small>{unappliedJobs.length}</small></h2><div className="job-grid">{unappliedJobs.length ? unappliedJobs.map((job) => <JobCard key={job._id} job={job} user={user} applications={applications} onSelect={onSelect} />) : <p className="empty-state">You have applied for every matching role.</p>}</div></section>
    <section className="job-group"><h2>Applied jobs <small>{appliedJobs.length}</small></h2><div className="job-grid">{appliedJobs.length ? appliedJobs.map((job) => <JobCard key={job._id} job={job} user={user} applications={applications} onSelect={onSelect} />) : <p className="empty-state">No applied jobs yet.</p>}</div></section>
  </>;
}

function isJobApplied(job, applications) {
  return applications.some((application) => String(application.jobId?._id || application.jobId) === String(job._id || job.id));
}

function JobCard({ job, user, applications, onSelect }) {
  const score = matchingScore(user.skills, job.skills);
  const applied = isJobApplied(job, applications);
  return <article className="job-card"><div className="card-topline"><div className="company-badge"><CompanyLogo company={job.company} /></div><span className={`score-badge ${score >= 60 ? "strong" : ""}`}>{score}% match</span></div><p className="company-name">{job.company}</p><h2>{job.role}</h2><p className="job-meta">{job.location} <span>·</span> {job.salary}</p><p className="deadline">Apply by {formatDeadline(job.deadline)}</p><div className="skill-list">{job.skills?.map((skill) => <span className={user.skills?.some((item) => item.toLowerCase() === skill.toLowerCase()) ? "matched" : ""} key={skill}>{skill}</span>)}</div><button className="outline-button" onClick={() => onSelect(job)}>{applied ? "Applied" : "View details"} <span>→</span></button></article>;
}

function JobModal({ job, user, applied, message, onClose, onApply, applying }) {
  const needsRelocationAnswer = job.location?.toLowerCase() !== "remote";
  const needsNightShiftAnswer = Boolean(job.requiresNightShifts);
  const [willingToRelocate, setWillingToRelocate] = useState("");
  const [willingToWorkNightShifts, setWillingToWorkNightShifts] = useState("");
  const [resumeChoice, setResumeChoice] = useState(user.resume?.filename ? "default" : "new");
  const [resumeFile, setResumeFile] = useState(null);
  const canApply = Boolean(user.resume?.filename || resumeFile);
  const readyToApply = Boolean((!needsRelocationAnswer || willingToRelocate) && (!needsNightShiftAnswer || willingToWorkNightShifts) && canApply);

  const submitApplication = (event) => {
    event.preventDefault();
    onApply({ willingToRelocate, willingToWorkNightShifts, resumeFile: resumeChoice === "new" ? resumeFile : null });
  };

  return <div className="modal-backdrop" onClick={onClose}><section className="job-modal" onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={onClose} aria-label="Close details">×</button><p className="company-name">{job.company}</p><h2>{job.role}</h2><p className="job-meta">{job.location} <span>·</span> {job.salary}</p><p className="deadline">Application deadline: {formatDeadline(job.deadline)}</p><div className="modal-score"><strong>{matchingScore(user.skills, job.skills)}%</strong><span>skill suitability based on your profile</span></div><div className="skill-list">{job.skills?.map((skill) => <span key={skill}>{skill}</span>)}</div><form className="application-form" onSubmit={submitApplication}>{(needsRelocationAnswer || needsNightShiftAnswer) && <p className="section-label">BEFORE YOU APPLY</p>}{needsRelocationAnswer && <label>Willing to relocate to {job.location}?<select value={willingToRelocate} onChange={(event) => setWillingToRelocate(event.target.value)} required><option value="">Select an answer</option><option value="Yes">Yes</option><option value="No">No</option></select></label>}{needsNightShiftAnswer && <label>Are you comfortable with night shifts?<select value={willingToWorkNightShifts} onChange={(event) => setWillingToWorkNightShifts(event.target.value)} required><option value="">Select an answer</option><option value="Yes">Yes</option><option value="No">No</option></select></label>}<fieldset><legend>Resume for this application</legend><label className="resume-choice"><input type="radio" name="resumeChoice" checked={resumeChoice === "default"} onChange={() => setResumeChoice("default")} disabled={!user.resume?.filename} /> Use default resume{user.resume?.originalName ? ` (${user.resume.originalName})` : ""}</label><label className="resume-choice"><input type="radio" name="resumeChoice" checked={resumeChoice === "new"} onChange={() => setResumeChoice("new")} /> Upload a different resume</label>{resumeChoice === "new" && <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResumeFile(event.target.files[0] || null)} required />}</fieldset>{message && <p className="form-message">{message}</p>}<button className="primary-button" type="submit" disabled={applied || applying || !readyToApply}>{applied ? "Applied" : applying ? "Submitting..." : "Apply for this role"}</button></form></section></div>;
}

export default App;
