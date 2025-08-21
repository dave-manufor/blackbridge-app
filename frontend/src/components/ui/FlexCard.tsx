import React from "react";
import styles from "./FlexCard.module.css";
const FlexCard = ({
  children,
  className,
  onClick,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      {...props}
      className={`${styles.card} ${className ? className : ""} ${
        onClick ? styles.clickable : ""
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
export default FlexCard;
