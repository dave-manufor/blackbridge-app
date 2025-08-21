import styles from "./LoadScreen.module.css";
import LogoDark from "@assets/img/blackbridge-logo-black.svg";
const LoadScreen = () => {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <img src={LogoDark} alt="Logo" className={styles.logo} />
        <div className={styles.circlesWrapper}>
          <div className={`${styles.circle} ${styles.circle1}`}></div>
          <div className={`${styles.circle} ${styles.circle2}`}></div>
          <div className={`${styles.circle} ${styles.circle3}`}></div>
        </div>
      </div>
    </div>
  );
};
export default LoadScreen;
