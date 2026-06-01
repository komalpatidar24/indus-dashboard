import React, { useState } from "react";
import { useNavigate } from "react-router";
import { postRequest } from "../api/api";

const IMAGES = {
  THOMSON_LOGO: "/White new logo1.png",
};

const UserLogin = () => {
  const getCurrentFiscalYear = () => {
    const today = new Date();
    const month = today.getMonth(); 
    const year = today.getFullYear();
    
    const startYear = month >= 3 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
  };

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear()); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fiscalYears = [
    "2022-2023",
    "2023-2024",
    "2024-2025",
    "2025-2026",
    "2026-2027",
  ];

  if (!fiscalYears.includes(fiscalYear)) {
    fiscalYears.push(fiscalYear);
    fiscalYears.sort(); 
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }

    // if (!password.trim()) {
    //   setError("Please enter your password");
    //   return;
    // }

    setIsLoading(true);
    setError("");
  const token = sessionStorage.getItem("CompanyToken");

    localStorage.setItem("UserName",username)
    localStorage.setItem("UserPassword",password)
    try {
      const parsedData = await postRequest("userauthenticate", {
        Username: username,
        Password: password,
        FiscalYear: fiscalYear,
        CompanyToken: token 
      });
      console.log("parsedData",parsedData)
      if (parsedData) {
        localStorage.setItem("userid", parsedData.Id);
        localStorage.setItem("username", parsedData.Username);
        localStorage.setItem("UserRole", parsedData.Role);
        localStorage.setItem("fiscalYear", fiscalYear);
        localStorage.setItem("CompanyID", parsedData.CompanyID);
        localStorage.setItem("ProductionUnitID", parsedData.ProductionUnitID);
        localStorage.setItem("HomePage", parsedData.HomePage);
        navigate("/dashboard/sales");
      } else {
        throw new Error("Invalid credentials provided.");
      }
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#e0f7fa] to-[#80deea] flex flex-col lg:flex-row items-center justify-center p-4 font-['Poppins'] animate-[fadeIn_1s_ease-in-out]">
      
      <img
        src={IMAGES.THOMSON_LOGO}
        alt="Company Logo"
        className="hidden lg:block w-1/2 max-w-[800px] transition-transform duration-300 hover:scale-110 mr-10"
      />

      <div className="bg-white rounded-[20px] shadow-[0_15px_35px_rgba(0,0,0,0.2)] w-full max-w-[500px] p-10 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,128,128,0.3)]">
        
        <img
          src={IMAGES.THOMSON_LOGO}
          alt="Company Logo"
          className="block lg:hidden w-[300px] mx-auto mb-5 transition-transform duration-300 hover:scale-110"
        />

        <h2 className="text-[#008080] text-[2rem] mb-5 tracking-[1px] font-semibold">
          User Login
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="text-left px-4 mb-[-10px]">
          </div>
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            className="w-full p-[15px] my-[15px] border-2 border-[rgba(0,128,128,0.3)] rounded-[25px] bg-[rgba(0,128,128,0.05)] text-[#2F4F4F] outline-none text-base transition-all focus:border-[#FF6F61] focus:shadow-[0_0_10px_rgba(255,111,97,0.5)] cursor-pointer font-semibold"
          >
            {fiscalYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-[15px] my-[15px] border-2 border-[rgba(0,128,128,0.3)] rounded-[25px] bg-[rgba(0,128,128,0.05)] text-[#2F4F4F] outline-none text-base transition-all focus:border-[#FF6F61] focus:shadow-[0_0_10px_rgba(255,111,97,0.5)]"
            autoFocus
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-[15px] my-[15px] border-2 border-[rgba(0,128,128,0.3)] rounded-[25px] bg-[rgba(0,128,128,0.05)] text-[#2F4F4F] outline-none text-base transition-all focus:border-[#FF6F61] focus:shadow-[0_0_10px_rgba(255,111,97,0.5)]"
          />

          {error && (
            <p className="text-red-500 text-sm mt-2 animate-pulse font-bold">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-[15px] mt-5 border-none rounded-[25px] bg-gradient-to-r from-[#008080] to-[#00bcd4] text-white text-[1.2rem] font-semibold cursor-pointer transition-all duration-300 hover:from-[#FF6F61] hover:to-[#FF8A65] hover:shadow-[0_10px_20px_rgba(255,111,97,0.5)] disabled:opacity-70"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserLogin;