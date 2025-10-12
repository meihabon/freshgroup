import React from "react";

const Footer: React.FC = () => {
  return (
        <footer
      className="text-center py-3 mt-auto text-white"
      style={{
        background: "linear-gradient(90deg, #2c7a7b, #38a169, #d4af37)",
        borderTop: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <small>© FreshGroup 2025</small>
    </footer>
  );
};

export default Footer;
