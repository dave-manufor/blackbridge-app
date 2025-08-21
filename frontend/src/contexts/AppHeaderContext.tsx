import { createContext, useState, ReactNode } from "react";

interface AppHeaderContextType {
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
}

const AppHeaderContext = createContext<AppHeaderContextType | undefined>(
  undefined
);

export const AppHeaderProvider = ({ children }: { children: ReactNode }) => {
  const [headerTitle, setHeaderTitle] = useState<string>("My Application");

  const value = { headerTitle, setHeaderTitle };

  return (
    <AppHeaderContext.Provider value={value}>
      {children}
    </AppHeaderContext.Provider>
  );
};

export default AppHeaderContext;
