import { createContext, useContext, useState } from "react";
const GovernorContext = createContext({
  token: "",
  setToken: (_value: string) => {},
});
export function GovernorLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  return (
    <GovernorContext.Provider value={{ token, setToken }}>
      {children}
    </GovernorContext.Provider>
  );
}
export const useGovernor = () => useContext(GovernorContext);
