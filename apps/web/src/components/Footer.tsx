import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      Questions or feedback?{" "}
      <a href="mailto:hello@lakewoodblock.club" className={styles.link}>
        hello@lakewoodblock.club
      </a>
    </footer>
  );
}
