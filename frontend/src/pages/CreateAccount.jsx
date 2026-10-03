import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "../styles/authFlow.css";
import { useState } from "react";
import authService, { dashboardFor } from "../services/authService";
import { errorMessage } from "../utils/apiError";

export default function CreateAccount() {
  const navigate = useNavigate();   

  const [error,setError]=useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form,setForm] = useState({
    firstName:"",
    lastName:"",
    email:"",
    password:"",
    role:"CANDIDATE",
    companyName:"",
    companyWebsite:""
  });

  const isRecruiter = form.role === "RECRUITER";

  const handleRegister = async () => {
    if (isRecruiter && !form.companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    setError("");
    setSubmitting(true);
    const payload = isRecruiter
      ? { ...form, companyName: form.companyName.trim(), companyWebsite: form.companyWebsite.trim() || null }
      : { firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, role: form.role };
    try {
      // The new account is signed in right away and lands on its overview. For a recruiter with a
      // website, the company import runs in the background and the overview shows its progress.
      const { user } = await authService.register(payload);
      if (user) {
        navigate(dashboardFor(user.role), { replace: true, state: { justSignedUp: true } });
      } else {
        navigate("/login", { replace: true, state: { notice: "Your account was created. Please log in." } });
      }
    } catch(error){
      setError(errorMessage(error, "Registration failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-flow-page">
      <div className="auth-flow-backdrop" />

      <div className="auth-flow-card auth-flow-card--signup">
        <div className="auth-flow-brand">
          <Logo width={150} />
        </div>

        
        <h1>Connecting ambition with opportunity</h1>
    

        <label>First Name</label>
        <input type="text" value={form.firstName} placeholder="Enter your first name" onChange={(e)=>setForm({...form,firstName:e.target.value})} />

        <label>Last Name</label>
        <input type="text" value={form.lastName} placeholder="Enter your last name" onChange={(e)=>setForm({...form,lastName:e.target.value})} />

        <label>Email</label>
        <input type="email" value={form.email} placeholder="company@email.com" onChange={(e)=>setForm({...form,email:e.target.value})}/>

        <label>Password</label>
        <input type="password" value={form.password} placeholder="••••••••" onChange={(e)=>setForm({...form,password:e.target.value})} />

        <label>Role</label>
        <select 
          value={form.role} 
          onChange={(e)=>setForm({...form,role:e.target.value})}
          className="auth-flow-select"
        >
          <option value="CANDIDATE">Candidate</option>
          <option value="RECRUITER">Recruiter</option>
        </select>

        {isRecruiter && (
          <>
            <label>Company name</label>
            <input type="text" value={form.companyName} placeholder="Your company" onChange={(e)=>setForm({...form,companyName:e.target.value})} />

            <label>Company website <span className="auth-flow-optional">(optional)</span></label>
            <input type="text" inputMode="url" value={form.companyWebsite} placeholder="www.yourcompany.com" onChange={(e)=>setForm({...form,companyWebsite:e.target.value})} />
            <p className="auth-flow-hint">We'll use it to pre-fill your company profile. You can review everything afterwards.</p>
          </>
        )}

        <button className="auth-flow-primary" onClick={handleRegister} type="button" disabled={submitting}>
          {submitting ? "Creating your account…" : "Create account"}
        </button>

        {error && <p className="error-message auth-flow-error" role="alert">{error}</p>}

        <button className="auth-flow-secondary" type="button" onClick={() => navigate("/login")}>
          Already have an account?
        </button>
      </div>
    </div>
  );
}
