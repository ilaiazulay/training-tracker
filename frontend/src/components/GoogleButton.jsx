function GoogleIcon({ className = "w-5 h-5" }) {
    return (
      <svg className={className} viewBox="0 0 24 24">
        <path
          d="M21.6 12.2273C21.6 11.5182 21.5364 10.8364 21.4182 10.1818H12V14.05H17.3818C17.15 15.3 16.45 16.3545 15.4091 17.0636V19.5727H18.4909C20.2909 17.9091 21.6 15.3455 21.6 12.2273Z"
          fill="#4285F4"
        />
        <path
          d="M12 22C14.7 22 16.9636 21.1045 18.4909 19.5728L15.4091 17.0636C14.5818 17.6182 13.4182 17.95 12 17.95C9.39545 17.95 7.19091 16.2727 6.40455 13.9H3.22728V16.4909C4.74546 19.8045 8.1 22 12 22Z"
          fill="#34A853"
        />
        <path
          d="M6.40455 13.9C6.2 13.3455 6.08182 12.7454 6.08182 12.1273C6.08182 11.5091 6.2 10.9091 6.40455 10.3545V7.76367H3.22727C2.59091 9.18186 2.25 10.7546 2.25 12.3637C2.25 13.9728 2.59091 15.5455 3.22727 16.9637L6.40455 13.9Z"
          fill="#FBBC05"
        />
        <path
          d="M12 6.77727C13.55 6.77727 14.9182 7.30909 15.9864 8.31818L18.5636 5.74092C16.9591 4.23637 14.7 3.36365 12 3.36365C8.1 3.36365 4.74545 5.5591 3.22728 8.87273L6.40455 11.9636C7.19091 9.59092 9.39545 7.91364 12 7.91364V6.77727Z"
          fill="#EA4335"
        />
      </svg>
    );
  }
  
  function GoogleButton({ text = "Continue with Google", onClick }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center justify-center gap-2 w-full border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-2.5 rounded-xl transition-all active:scale-[0.98]"
      >
        <GoogleIcon />
        <span>{text}</span>
      </button>
    );
  }
  
  export default GoogleButton;
  