import { roleMap } from '../../utils/formations';

/** Tiny vertical pitch with a dot per role — attack at the top. */
export default function MiniFormation({ roles, width = 34 }) {
  return (
    <svg className="mini-formation" width={width} height={width * 1.4} viewBox="0 0 68 96" aria-hidden="true">
      <rect x="1" y="1" width="66" height="94" rx="4" />
      <line x1="1" y1="48" x2="67" y2="48" />
      <rect x="20" y="78" width="28" height="17" />
      {roles.map((role, index) => {
        const coord = roleMap[role] ?? roleMap.CM;
        return <circle key={`${role}-${index}`} cx={(coord.x / 100) * 68} cy={(coord.y / 100) * 96} r="5" />;
      })}
    </svg>
  );
}
