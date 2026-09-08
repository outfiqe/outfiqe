export const THEME_STORAGE_KEY = "outfiqe-theme";

export const DARK_CLASS = "dark";

export const THEME_INIT_SCRIPT = `(()=>{try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s?s==="${DARK_CLASS}":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("${DARK_CLASS}",d);}catch(e){}})();`;

export const THEME_INIT_SCRIPT_SHA256 = "sha256-9+V0dqPHCUOk62d0hACIBmr6OhnVXvQ9wvU4Yol2SQ4=";
