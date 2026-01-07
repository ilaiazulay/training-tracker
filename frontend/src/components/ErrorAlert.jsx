function ErrorAlert({ message }) {
    if (!message) return null; // render nothing if there's no error
  
    return (
      <div className="text-xs text-red-300 bg-red-900/40 border border-red-500/40 rounded-lg px-3 py-2">
        {message}
      </div>
    );
  }
  
  export default ErrorAlert;
  