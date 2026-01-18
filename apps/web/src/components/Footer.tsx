import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer} data-testid="footer">
      Questions or feedback?{" "}
      <a href="mailto:hello@lakewoodblock.club" className={styles.link} data-testid="footer-email-link">
        hello@lakewoodblock.club
      </a>
    </footer>
  );
}
