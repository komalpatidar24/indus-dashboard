import Swal from "sweetalert2";
export const swalAlert = (type, text) => {
  const configs = {
    success: { 
        color: "#10b981", 
        icon: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`, 
        bg: "from-emerald-500 to-teal-600",
        shadow: "shadow-emerald-200"
    },
    error: { 
        color: "#f43f5e", 
        icon: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>`, 
        bg: "from-rose-500 to-red-600",
        shadow: "shadow-rose-200"
    },
    warning: { 
        color: "#f59e0b", 
        icon: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`, 
        bg: "from-amber-400 to-orange-500",
        shadow: "shadow-amber-200"
    },
    info: { 
        color: "#8b5cf6", 
        icon: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`, 
        bg: "from-purple-600 to-blue-500",
        shadow: "shadow-purple-200"
    },
  };

  const config = configs[type] || configs.info;

  return Swal.fire({
    toast: true,
    position: "bottom-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "transparent",
    showClass: { popup: "animate__animated animate__fadeInUp animate__faster" },
    hideClass: { popup: "animate__animated animate__fadeOutDown animate__faster" },
    html: `
      <div class="flex items-center bg-white/95 backdrop-blur-md border-2 border-purple-100 p-4 rounded-2xl shadow-[0_10px_40px_rgba(139,92,246,0.15)] min-w-[320px]">
        <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br ${config.bg} ${config.shadow} shadow-lg">
          ${config.icon}
        </div>
        <div class="ml-4 text-left">
          <p class="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-0.5">${type}</p>
          <p class="text-sm font-bold text-slate-800 leading-tight">${text}</p>
        </div>
      </div>
    `,
    customClass: {
      popup: "bg-transparent border-none shadow-none overflow-hidden",
    }
  });
};

export const swalConfirm = async (text, type = 'confirm') => {
  const configs = {
    delete: {
        icon: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`,
        bg: "bg-rose-500",
        lightBg: "bg-rose-50",
        shadow: "shadow-rose-200",
        btn: "bg-rose-600 hover:bg-rose-700"
    },
    confirm: {
        icon: `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`,
        bg: "bg-gradient-to-r from-purple-600 to-blue-500",
        lightBg: "bg-gradient-to-br from-purple-50 to-blue-50",
        shadow: "shadow-purple-200",
        btn: "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
    }
  };

  const config = configs[type] || configs.confirm;

  const result = await Swal.fire({
    background: "transparent",
    showConfirmButton: false,
    showCancelButton: false,
    width: "35rem",
    padding: "0",
    backdrop: `rgba(65, 64, 66, 0.3)`,
    html: `
      <div class="bg-white rounded-[2rem] overflow-hidden shadow-2xl border-2 border-purple-100 animate__animated animate__zoomIn animate__faster">
        <div class="p-8">
          <div class="w-16 h-16 ${config.lightBg} rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div class="w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center shadow-lg ${config.shadow}">
              ${config.icon}
            </div>
          </div>

          <h2 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500 tracking-tight mb-2 uppercase">${type === 'delete' ? 'Confirm Delete' : 'Confirm Action'}</h2>
          <p class="text-slate-600 text-sm font-bold leading-relaxed mb-8 px-4">
            ${text}
          </p>

          <div class="grid grid-cols-2 gap-3">
            <button id="cancel-btn" class="py-3.5 rounded-xl text-sm font-black text-purple-600 hover:bg-purple-50 transition-all border-2 border-purple-200">
              CANCEL
            </button>
            <button id="confirm-btn" class="py-3.5 rounded-xl text-sm font-black text-white ${config.btn} shadow-lg shadow-purple-200 transition-all active:scale-95">
              CONFIRM
            </button>
          </div>
        </div>
      </div>
    `,
    didOpen: () => {
      document.getElementById('confirm-btn').addEventListener('click', () => Swal.clickConfirm());
      document.getElementById('cancel-btn').addEventListener('click', () => Swal.clickCancel());
    }
  });

  return result.isConfirmed;
};