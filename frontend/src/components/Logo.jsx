import logo from "../images/LogoHireHub.webp";

export default function Logo({ width = 180 }) {
  return (
    <img
      src={logo}
      alt="HireHub"
      width={width}
      className="brand-logo"
    />
  );
}