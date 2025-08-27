import { useReducer } from "react";

type PageAction =
  | { type: "NEXT" }
  | { type: "PREVIOUS" }
  | { type: "SET"; payload: number };

function pageReducer(state: number, action: PageAction): number {
  switch (action.type) {
    case "NEXT":
      return state + 1;
    case "PREVIOUS":
      return state > 1 ? state - 1 : 1;
    case "SET":
      return action.payload > 0 ? Math.trunc(action.payload) : state;
    default:
      return state;
  }
}

const usePageReducer = (initialValue?: number) => {
  const initial = Math.max(1, Math.trunc(initialValue ?? 1));
  const [page, dispatch] = useReducer(pageReducer, initial);
  return { page, dispatch };
};

export default usePageReducer;
