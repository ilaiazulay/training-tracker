function PlanSelector({ planType, onChange }) {
  const plans = [
    { value: "AB", label: "AB" },
    { value: "ABC", label: "ABC" },
    { value: "ABCD", label: "ABCD" },
    { value: "FULL_BODY", label: "Full body" },
  ];

  return (
    <div className="flex justify-center gap-2 mb-2 flex-wrap">
      {plans.map((plan) => {
        const isActive = planType === plan.value;

        return (
          <button
            key={plan.value}
            type="button"
            onClick={() => onChange(plan.value)}
            className={[
              "text-xs px-3 py-1.5 rounded-full border transition-all",
              "focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 focus:ring-offset-slate-900",
              isActive
                ? "bg-emerald-400 text-slate-900 border-emerald-300 shadow-md scale-[1.03]"
                : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10",
            ].join(" ")}
          >
            {plan.label}
          </button>
        );
      })}
    </div>
  );
}

export default PlanSelector;
