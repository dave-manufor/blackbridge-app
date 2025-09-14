import styles from "./GridSection.module.css";
const GridSection = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <section className={`${styles.section} ${className ? className : ""}`}>
      {children}
    </section>
  );
};
export default GridSection;
