import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "../styles/splash.css";

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-screen">
      <div className="splash-backdrop">
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </div>

      <div className="splash-content">
        <div className="logo-wrap">
          <Logo width={450} />
        </div>

        <button className="story-button" onClick={() => navigate("/login")}>
          Start your own story
        </button>
      </div>
    </div>
  );
}