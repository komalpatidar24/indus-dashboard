import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postRequest } from "../api/api";

const IMAGES = {
  THOMSON_LOGO: "/White new logo1.png", 
};

const CompanyLogin = () => {
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const triggerError = (msg) => {
    setError(msg);
    setTimeout(() => {
      setError("");
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();

  if (!trimmedUsername || !trimmedPassword) {
    triggerError("Please enter both Company Name and Password");
    return;
  }
    
    setIsLoading(true);
    setError("");
 localStorage.setItem("CompanyName", trimmedUsername);
  localStorage.setItem("CompanyPassword", trimmedPassword);
    try {
      const response = await postRequest("companyauthentication");

      if (response && response.message == true ||response.message == 'Success') {
        localStorage.setItem("CompanyName", username);
          if (response.CompanyToken) {
            sessionStorage.setItem("CompanyToken", response.CompanyToken);
            sessionStorage.setItem("CompanyName", response.CompanyName);
          } 
        navigate("/user-login");
      } else {
        triggerError(response?.message || "Invalid Company Name or Password.");
        setPassword("");
      }
    } catch {
      triggerError("Invalid Company Name or Password.");
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

      <div className="bg-white rounded-[20px] shadow-[0_15px_35px_rgba(0,0,0,0.2)] w-full max-w-[400px] p-10 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,128,128,0.3)]">
        
        <img
          src={IMAGES.THOMSON_LOGO}
          alt="Company Logo"
          className="block lg:hidden w-[300px] mx-auto mb-5 transition-transform duration-300 hover:scale-110"
        />

        <h2 className="text-[#008080] text-[2rem] mb-5 tracking-[1px] font-semibold">
          Company Login
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Company Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-[15px] my-[10px] border-2 border-[rgba(0,128,128,0.3)] rounded-[25px] bg-[rgba(0,128,128,0.05)] text-[#2F4F4F] outline-none text-base transition-all focus:border-[#FF6F61] focus:shadow-[0_0_10px_rgba(255,111,97,0.5)]"
          />

          <input
            type="password"
            placeholder="Company Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-[15px] my-[10px] border-2 border-[rgba(0,128,128,0.3)] rounded-[25px] bg-[rgba(0,128,128,0.05)] text-[#2F4F4F] outline-none text-base transition-all focus:border-[#FF6F61] focus:shadow-[0_0_10px_rgba(255,111,97,0.5)]"
          />

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-2 my-2 animate-pulse">
               <p className="text-red-600 text-xs font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-[15px] mt-4 border-none rounded-[25px] bg-gradient-to-r from-[#008080] to-[#00bcd4] text-white text-[1.2rem] font-semibold cursor-pointer transition-all duration-300 hover:from-[#FF6F61] hover:to-[#FF8A65] hover:shadow-[0_10px_20px_rgba(255,111,97,0.5)] disabled:opacity-70"
          >
            {isLoading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <div className="mt-5 text-sm text-[#2F4F4F]">
          {/* <a href="#" className="text-[#FF6F61] no-underline transition-colors hover:text-[#008080]">
            Forgot Password?
          </a> */}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
};


export default CompanyLogin;