import logo from "../images/LogoHireHub.png";

export default function Logo({ width = 180 }) {
  return (
    <img
      src={logo}
      alt="HireHub"
      style={{
        width,
        height: "auto",
        display: "block",
        filter: "brightness(1.06) saturate(1.08)",
      }}
    />
  );
}