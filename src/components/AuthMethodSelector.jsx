import React, { useState, useEffect } from "react";

const AuthMethodSelector = ({ onAuthMethodSelected }) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [buttonsVisible, setButtonsVisible] = useState(true);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    if (showCustomForm) {
      setButtonsVisible(false);
      setTimeout(() => setFormVisible(true), 250);
    } else {
      setFormVisible(false);
      setTimeout(() => setButtonsVisible(true), 250);
    }
  }, [showCustomForm]);

  const handleDefaultSubmit = (e) => {
    e.preventDefault();
    onAuthMethodSelected({ useDefault: true });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    onAuthMethodSelected({ useDefault: false, clientId, clientSecret });
  };

  const handleBackClick = () => {
    setShowCustomForm(false);
    setClientId("");
    setClientSecret("");
  };

  const NocturneIcon = ({ className }) => (
    <svg
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M30.1882 0.91026C30.6242 1.34617 30.9209 1.90182 31.0406 2.50666C31.1602 3.11151 31.0974 3.73826 30.8602 4.30735C28.9638 8.85843 27.991 13.741 27.9981 18.6714C27.9981 28.5721 31.9312 38.0673 38.9321 45.0681C45.933 52.069 55.4282 56.002 65.329 56.002C70.2593 56.0091 75.1419 55.0363 79.693 53.14C80.2617 52.9031 80.8879 52.8405 81.4923 52.9599C82.0966 53.0794 82.6519 53.3755 83.0877 53.8109C83.5235 54.2463 83.8203 54.8013 83.9403 55.4055C84.0604 56.0097 83.9984 56.636 83.7621 57.2049C80.4522 65.1408 74.868 71.9197 67.7127 76.6879C60.5574 81.4561 52.1511 84.0003 43.5526 84C19.4991 84 0 64.5051 0 40.4476C0 22.3298 11.0624 6.80021 26.7952 0.238308C27.3638 0.00196178 27.9897 -0.0603476 28.5937 0.0592703C29.1977 0.178888 29.7526 0.475053 30.1882 0.91026Z"
        fill="#666ABA"
      />
    </svg>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <NocturneIcon className="mx-auto h-10 w-auto" />
        <h2 className="mt-10 text-center text-[32px] font-[580] text-white tracking-tight">
          Welcome to Nocturne
        </h2>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="relative h-[140px]">
          <div
            className={`space-y-6 mt-2 absolute top-0 left-0 w-full transition-opacity duration-250 ${
              buttonsVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ pointerEvents: buttonsVisible ? "auto" : "none" }}
          >
            <button
              onClick={handleDefaultSubmit}
              className="flex w-full justify-center rounded-full bg-[#666ABA] px-3 py-1.5 text-[18px] font-[560] text-white tracking-tight shadow-sm"
            >
              Use Default Credentials
            </button>
            <button
              onClick={() => setShowCustomForm(true)}
              className="flex w-full justify-center rounded-full ring-[#666ABA] ring-2 ring-inset px-3 py-1.5 text-[18px] font-[560] text-white tracking-tight shadow-sm"
            >
              Use Custom Credentials
            </button>
          </div>

          <form
            onSubmit={handleCustomSubmit}
            className={`space-y-6 absolute top-0 left-0 w-full transition-opacity duration-250 ${
              formVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ pointerEvents: formVisible ? "auto" : "none" }}
          >
            <div>
              <div className="mt-2">
                <input
                  id="clientId"
                  name="clientId"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  placeholder="Client ID"
                  className="block w-full rounded-md border-0 bg-white/5 py-1.5 px-2 text-white shadow-sm ring-1 ring-inset focus:outline-none ring-white/10 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <div className="mt-2">
                <input
                  id="clientSecret"
                  name="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  required
                  placeholder="Client Secret"
                  className="block w-full rounded-md border-0 bg-white/5 py-1.5 px-2 text-white shadow-sm ring-1 ring-inset focus:outline-none ring-white/10 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBackClick}
                className="flex w-full justify-center rounded-full ring-[#666ABA] ring-2 ring-inset px-3 py-1.5 text-[18px] font-[580] text-white tracking-tight shadow-sm"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex w-full justify-center rounded-full bg-[#666ABA] px-3 py-1.5 text-[18px] font-[580] text-white tracking-tight shadow-sm"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthMethodSelector;
