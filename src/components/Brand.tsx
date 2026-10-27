import { Link } from "@/lib/wouter";
import { useI18n } from "@/lib/i18n";

export default function Brand({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label={`${t("Home")} — Northwest Moving Crew`}
    >
      <span className="brand-symbol">
        <svg viewBox="0 0 44 44" aria-hidden="true">
          <path
            d="M5 21.8 22 7l17 14.8v14.7c0 1.4-1.1 2.5-2.5 2.5h-8.7V27.3H16.2V39H7.5A2.5 2.5 0 0 1 5 36.5V21.8Z"
            fill="currentColor"
          />
          <path
            d="M14 19.5h16m-4.4-4.9 4.9 4.9-4.9 4.9"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="brand-words">
        <strong>
          Northwest<span>Crew</span>
        </strong>
        {!compact && <small>{t("MOVING & DELIVERY")}</small>}
      </span>
    </Link>
  );
}
