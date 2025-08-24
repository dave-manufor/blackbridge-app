import { useReducer } from "react";

function pageReducer(
  state: number,
  action: { type: "NEXT" | "PREVIOUS" | "SET"; payload?: number }
): number {
  switch (action.type) {
    case "NEXT":
      return state + 1;
    case "PREVIOUS":
      return state > 1 ? state - 1 : 1;
    case "SET":
      return action.payload && action.payload > 0 ? action.payload : state;
    default:
      return state;
  }
}

const usePageReducer = (initialValue?: number) => {
  const [page, dispatch] = useReducer(pageReducer, initialValue || 1);
  return { page, dispatch };
};

export default usePageReducer;
