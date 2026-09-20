import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "../styles/authFlow.css";
import { useState } from "react";
import api from "../services/api";

export default function CreateAccount() {
  const navigate = useNavigate();   

  const [error,setError]=useState("");

  const [form,setForm] = useState({
    firstName:"",
    lastName:"",
    email:"",
    password:"",
    role:"CANDIDATE"
  });




  const handleRegister = async () => {
    try {
      const response = await api.post(
        "/auth/register",
        form
      );
      console.log(response.data);
      navigate("/login", { replace: true });
    } catch(error){
      setError(
        error.response?.data || "Registration failed"
      );
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
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid rgba(16, 42, 114, 0.14)",
            color: "#0b1020",
            background: "rgba(248, 250, 255, 0.9)",
            fontSize: "0.94rem",
            outline: "none",
            cursor: "pointer"
          }}
        >
          <option value="CANDIDATE">Candidate</option>
          <option value="RECRUITER">Recruiter</option>
        </select>

        <button className="auth-flow-primary" onClick={handleRegister} type="button">
          Create account
        </button>

        {error && <p className="error-message" style={{ color: "#d32f2f", marginTop: "10px", fontSize: "0.88rem", textAlign: "center" }}>{error}</p>}

        <button className="auth-flow-secondary" type="button" onClick={() => navigate("/login")}>
          Already have an account?
        </button>
      </div>
    </div>
  );
}
