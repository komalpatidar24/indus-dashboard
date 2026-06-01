import Swal from "sweetalert2";
export const showCustomDialog = async ({
  type = "confirm",
  title,
  text,
}) => {
  let bgColor = "#003366";
  let showCancel = true;
  let confirmText = "Yes";
  let cancelText = "No";
  let confirmBtnClass =
    "bg-green-100 text-green-700 px-6 py-2 rounded-lg ml-3";
  let cancelBtnClass =
    "bg-red-100 text-red-700 px-6 py-2 rounded-lg";
  let showCloseButton = false;
  let showConfirmButton = true;
  if (type === "success") {
    bgColor = "#4db064ff";
    title = title || "SUCCESS";
    showCancel = false;
    showConfirmButton = false;
    showCloseButton = true;
  }
  if (type === "alert") {
    bgColor = "#2da3b5ff"; 
    title = title || "ALERT !!";
    showCancel = false;
    showConfirmButton = false;
    showCloseButton = true;
  }
  if (type === "warning") {
    bgColor = "#4db064ff";
    title = title || "WARNING !";
    showCancel = false;
    showConfirmButton = false;
    showCloseButton = true;
  }
  if (type === "error") {
    bgColor = "#c44653ff"; 
    title = title || "ERROR";
    showCancel = false;
    showConfirmButton = false;
    showCloseButton = true;
  }
  if (type === "confirm") {
    title = title || "CONFIRMATION";
  }
  const result = await Swal.fire({
    title,
    text,
    showCancelButton: showCancel,
    showConfirmButton,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    showCloseButton,
    reverseButtons: true,
    buttonsStyling: false,
    width: "350px",
    customClass: {
      popup: "rounded-xl shadow-lg overflow-hidden bg-white",
      title: "custom-title",
      htmlContainer: "mt-6 text-gray-900 text-sm text-center",
      confirmButton: confirmBtnClass,
      cancelButton: cancelBtnClass,
    },
    didOpen: () => {
      const titleEl = document.querySelector(".custom-title");
      if (titleEl) {
        titleEl.style.backgroundColor = bgColor;
        titleEl.style.color = "#FFFFFF";
        titleEl.style.fontWeight = "bold";
        titleEl.style.fontSize = "14px";
        titleEl.style.padding = "15px 15px";
        titleEl.style.textAlign = "center";
        titleEl.style.borderRadius = "0.5rem 0.5rem 0 0";
      }
    },
  });
  return result.isConfirmed;
};