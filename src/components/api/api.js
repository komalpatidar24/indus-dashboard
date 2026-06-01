import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => {
  const companyName = localStorage.getItem("CompanyName")?.trim() || "";
  const companyPassword = localStorage.getItem("CompanyPassword")?.trim() || "";
  return {
    Authorization: "Basic " + btoa(`${companyName}:${companyPassword}`),
    "Content-Type": "application/json",
  };
};

const getAuthHeadersForFile = () => {
  const companyName = localStorage.getItem("CompanyName")?.trim() || "";
  const companyPassword = localStorage.getItem("CompanyPassword")?.trim() || "";

  return {
    Authorization: "Basic " + btoa(`${companyName}:${companyPassword}`),
  };
};

export const postRequest = async (endpoint, data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/${endpoint}`, data, {
      headers: getAuthHeaders(),
    });

    let parsed = response.data;
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch (error) {
    console.error("Error in postRequest:", error);
    throw error;
  }
};

export const postRequestWithFile = async (endpoint, data, files) => {
  const formData = new FormData();

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    }
  }

  if (files && files.length > 0) {
    files.forEach(fileObj => {
      const actualFile = fileObj instanceof File ? fileObj : fileObj.file;
      if (actualFile) {
        formData.append('attachmentFile', actualFile);
      }
    });
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/${endpoint}`, formData, {
      headers: getAuthHeadersForFile(),
    });

    let parsed = response.data;
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch (error) {
    console.error("Error in postRequestWithFile:", error);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    throw error;
  }
};
