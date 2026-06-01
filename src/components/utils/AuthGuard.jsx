import { useEffect } from "react";
import { useNavigate } from "react-router";
import Header from "../common/Header";

const AuthGuard = ({ children }) => {
  const navigate = useNavigate();
  const user = localStorage.getItem("user");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);
  if (!user) return null;

  return (
    <>
      <Header />
      {children}
    </>
  );
};

export default AuthGuard;
